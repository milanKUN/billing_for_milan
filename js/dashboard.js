// Check authentication - using token from localStorage
const token = localStorage.getItem("token");

if (!token) {
    location.href = "login.html";
}

// Fetch user data from API
async function fetchUserData() {
    try {
        const response = await fetch('https://api.dndconsultancytest.com/get-profile.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: token })
        });
        
        const data = await response.json();
        
        if (data.status === true) {
            // Update UI with API data
            const userName = data.data.name;
            const userInitials = getInitials(userName);
            
            // Update all UI elements with user name
            document.getElementById('userName').textContent = userName;
            document.getElementById('userAvatar').textContent = userInitials;
            document.getElementById('welcomeName').textContent = userName.split(' ')[0];
            
            // Optional: Store in localStorage for offline use
            localStorage.setItem('userName', userName);
            
            return data.data;
        } else {
            // Token invalid, redirect to login
            console.error('Invalid token:', data.message);
            localStorage.clear();
            location.href = "login.html";
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to localStorage if API fails
        const storedName = localStorage.getItem("userName") || "User";
        document.getElementById('userName').textContent = storedName;
        document.getElementById('userAvatar').textContent = getInitials(storedName);
        document.getElementById('welcomeName').textContent = storedName.split(' ')[0];
    }
}

// Helper function to get initials from name
function getInitials(name) {
    if (!name) return "US";
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
}

// Mobile sidebar functionality (keep this same)
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
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

// Logout function
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.clear();
        location.href = "index.html";
    }
}

// Search functionality
const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        const projects = document.querySelectorAll('.project-info h4');

        projects.forEach(project => {
            const projectName = project.textContent.toLowerCase();
            const projectRow = project.closest('tr');

            if (projectName.includes(searchTerm)) {
                projectRow.style.display = '';
            } else {
                projectRow.style.display = 'none';
            }
        });
    });
}

// Initialize - fetch user data
fetchUserData();