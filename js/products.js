// Check authentication
const token = localStorage.getItem("token");
if (!token) {
    location.href = "index.html";
}

// Function to fetch and display user data from API
async function fetchUserProfile() {
    try {
        const response = await fetch('https://api.dndconsultancytest.com/get-profile.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: token })
        });
        
        const data = await response.json();
        
        if (data.status === true && data.data) {
            const userName = data.data.name;
            const userInitials = getInitials(userName);
            
            // Update UI with user data from API
            document.getElementById('userName').textContent = userName;
            document.getElementById('userAvatar').textContent = userInitials;
            
            // Store in localStorage for future use
            localStorage.setItem('userName', userName);
            
            return data.data;
        } else {
            // If API fails, use localStorage fallback
            console.warn('Failed to fetch user profile, using localStorage data');
            useLocalStorageData();
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Use localStorage as fallback
        useLocalStorageData();
    }
}

// Fallback function to use localStorage data
function useLocalStorageData() {
    const userName = localStorage.getItem("userName") || "User";
    const userInitials = getInitials(userName);
    
    document.getElementById('userName').textContent = userName;
    document.getElementById('userAvatar').textContent = userInitials;
}

// Helper function to get initials from name
function getInitials(name) {
    if (!name) return "U";
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
}

// Call the function to fetch user data when page loads
fetchUserProfile();

// Mobile sidebar functionality
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// Toggle sidebar
menuToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

// Close sidebar when clicking overlay
sidebarOverlay.addEventListener('click', function () {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// Close sidebar when clicking a link inside it
const navLinks = document.querySelectorAll('.nav-item');
navLinks.forEach(link => {
    link.addEventListener('click', function () {
        if (window.innerWidth <= 992) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    });
});

// Close sidebar when pressing escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
});

// Handle window resize
window.addEventListener('resize', function () {
    if (window.innerWidth > 992) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
});

// Products functionality
let editId = null;
let dataTable = null;

// Initialize DataTable
$(document).ready(function () {
    dataTable = $('#productTable').DataTable({
        responsive: true,
        pageLength: 10,
        lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
        order: [[0, 'desc']],
        columns: [
            {
                data: 'id',
                visible: false,
                searchable: false
            },
            { data: 'product_name' },
            {
                data: 'hsn_number',
                render: function (data) {
                    return data || "-";
                }
            },
            {
                data: 'price',
                render: function (data) {
                    return '₹' + parseFloat(data).toFixed(2);
                }
            },
            {
                data: 'id',
                orderable: false,
                searchable: false,
                render: function (data, type, row) {
                    return `
                                <div class="action-btns">
                                    <button class="action-btn edit-btn" onclick="editProduct(${data})">
                                        <i class="fas fa-edit"></i>
                                        <span>Edit</span>
                                    </button>
                                    <button class="action-btn delete-btn" onclick="deleteProduct(${data})">
                                        <i class="fas fa-trash"></i>
                                        <span>Delete</span>
                                    </button>
                                </div>
                            `;
                }
            }
        ],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search products..."
        }
    });

    loadProducts();

    // Initialize table search
    $('#tableSearch').on('keyup', function () {
        dataTable.search(this.value).draw();
    });
});

// Show/hide form
function showForm() {
    document.getElementById('formSection').style.display = 'block';
    resetForm();
    document.getElementById('product_name').focus();
    scrollToForm();
}

function hideForm() {
    document.getElementById('formSection').style.display = 'none';
    resetForm();
}

function scrollToForm() {
    document.getElementById('formSection').scrollIntoView({
        behavior: 'smooth'
    });
}

function resetForm() {
    editId = null;
    document.getElementById('formTitle').textContent = 'Add New Product';
    document.getElementById('formSubtitle').textContent = 'Fill in the product details below';
    document.getElementById('product_name').value = '';
    document.getElementById('hsn').value = '';
    document.getElementById('price').value = '';
    document.getElementById('message').style.display = 'none';
}

function cancelForm() {
    if (document.getElementById('product_name').value ||
        document.getElementById('hsn').value ||
        document.getElementById('price').value) {
        if (!confirm('Are you sure you want to discard changes?')) {
            return;
        }
    }
    hideForm();
}

// Load products
function loadProducts() {
    fetch("https://api.dndconsultancytest.com/get-products.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
    })
        .then(res => res.json())
        .then(res => {
            if (res.status && res.data) {
                // Clear and add data to DataTable
                dataTable.clear();

                res.data.forEach(p => {
                    dataTable.row.add({
                        id: p.id,
                        product_name: p.product_name,
                        hsn_number: p.hsn_number,
                        price: p.price
                    });
                });

                dataTable.draw();
            } else {
                showMessage('Failed to load products', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading products:', error);
            showMessage('Network error. Please try again.', 'error');
        });
}

// Form submission
document.getElementById('productForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const productName = document.getElementById('product_name').value.trim();
    const hsn = document.getElementById('hsn').value.trim();
    const price = document.getElementById('price').value.trim();

    // Validation
    if (!productName) {
        showMessage('Product name is required', 'error');
        document.getElementById('product_name').focus();
        return;
    }

    if (!price || isNaN(price) || parseFloat(price) <= 0) {
        showMessage('Please enter a valid price', 'error');
        document.getElementById('price').focus();
        return;
    }

    const data = {
        token: token,
        id: editId,
        product_name: productName,
        hsn_number: hsn,
        price: price
    };

    const url = editId
        ? "https://api.dndconsultancytest.com/update-product.php"
        : "https://api.dndconsultancytest.com/add-product.php";

    // Show loading state
    const saveBtn = document.getElementById('saveBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');

    saveBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(res => {
            if (res.status) {
                showMessage(res.message || 'Product saved successfully!', 'success');
                resetForm();
                loadProducts();
                setTimeout(hideForm, 1500);
            } else {
                showMessage(res.message || 'Error saving product', 'error');
            }
        })
        .catch(error => {
            console.error('Error saving product:', error);
            showMessage('Network error. Please try again.', 'error');
        })
        .finally(() => {
            // Reset button state
            saveBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        });
});

// Edit product
function editProduct(id) {
    fetch("https://api.dndconsultancytest.com/get-products.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
    })
        .then(res => res.json())
        .then(res => {
            if (res.status && res.data) {
                const product = res.data.find(p => p.id == id);
                if (product) {
                    editId = product.id;
                    document.getElementById('formTitle').textContent = 'Edit Product';
                    document.getElementById('formSubtitle').textContent = 'Update the product details';
                    document.getElementById('product_name').value = product.product_name;
                    document.getElementById('hsn').value = product.hsn_number || '';
                    document.getElementById('price').value = product.price;
                    document.getElementById('formSection').style.display = 'block';
                    scrollToForm();
                }
            }
        });
}

// Delete product
function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    fetch("https://api.dndconsultancytest.com/delete-product.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token })
    })
        .then(res => res.json())
        .then(res => {
            if (res.status) {
                showMessage('Product deleted successfully!', 'success');
                loadProducts();
            } else {
                showMessage(res.message || 'Error deleting product', 'error');
            }
        });
}

// Refresh products
function refreshProducts() {
    loadProducts();
    showMessage('Products list refreshed', 'success');
}

// Show message
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Logout function
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.clear();
        location.href = "index.html";
    }
}