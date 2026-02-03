/* ================= GLOBAL ================= */
const token = localStorage.getItem("token");
if (!token) {
    location.href = "index.html";
}
let PRODUCT_LIST = [];
let isUpdatingPDF = false;

// Cache for logo base64
let logoBase64Cache = null;

async function fetchLogoBase64() {
    if (!token) return null;

    // Return cached value if available
    if (logoBase64Cache) {
        return logoBase64Cache;
    }

    try {
        // First, get the logo URL from profile
        const profileRes = await fetch("https://api.dndconsultancytest.com/get-profile.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });

        const profile = await profileRes.json();

        if (!profile.status || !profile.data.logo) {
            return null;
        }

        const logoUrl = profile.data.logo;

        // If the logo URL is already a base64 data URL, return it
        if (logoUrl.startsWith('data:')) {
            logoBase64Cache = logoUrl;
            return logoUrl;
        }

        // Try to fetch the logo via a CORS proxy
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(logoUrl)}`;

        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                logoBase64Cache = reader.result;
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    } catch (error) {
        console.error("Failed to fetch logo base64:", error);

        // Fallback: Create a simple text-based logo
        const companyName = document.getElementById('mobileCompanyName').textContent;
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#3498db';
        ctx.fillRect(0, 0, 200, 80);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = companyName.split(' ');
        if (words.length > 1) {
            ctx.fillText(words[0], 100, 30);
            ctx.fillText(words.slice(1).join(' '), 100, 50);
        } else {
            ctx.fillText(companyName.substring(0, 15), 100, 40);
        }

        logoBase64Cache = canvas.toDataURL('image/png');
        return logoBase64Cache;
    }
}

/* ================= ON LOAD ================= */
document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication
    if (!token) {
        alert("Please login first");
        window.location.href = "index.html";
        return;
    }

    /* TODAY DATE */
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('mobileInvoiceDate').textContent = today;
    document.getElementById('pdfInvoiceDate').textContent = today;

    /* ================= LOAD PROFILE ================= */
    try {
        const res = await fetch("https://api.dndconsultancytest.com/get-profile.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });
        const profile = await res.json();

        if (profile.status) {
            // Update text content
            document.getElementById('mobileCompanyName').textContent = profile.data.business_name || profile.data.name || "Your Company Name";
            document.getElementById('mobileCompanyAddress').textContent = profile.data.address || "123 Business Street, City";
            document.getElementById('mobileCompanyPhone').textContent = profile.data.phone || "Phone: (123) 456-7890";
            document.getElementById('mobileCompanyEmail').textContent = profile.data.email || "info@company.com";

            // =========== AUTO LOAD UPI ID ===========
            if (profile.data.upi_id) {
                document.getElementById('mobileUpiId').value = profile.data.upi_id;
                document.getElementById('pdfUpiId').textContent = profile.data.upi_id;
                document.getElementById('mobileUpiText').textContent = profile.data.upi_id;
                document.getElementById('pdfUpiText').textContent = profile.data.upi_id;
            }
            // =======================================

            // Load logo for mobile view
            if (profile.data.logo) {
                const mobileLogoEl = document.getElementById('mobileLogoPreview');
                const mobileLogoPlaceholder = mobileLogoEl.parentElement.querySelector('.logo-placeholder');

                mobileLogoEl.src = profile.data.logo;
                mobileLogoEl.style.display = "block";
                mobileLogoPlaceholder.style.display = "none";

                // Also set it to PDF view immediately
                const pdfLogoEl = document.getElementById('pdfLogoPreview');
                pdfLogoEl.src = profile.data.logo;
                pdfLogoEl.style.display = "block";
            }

            // Try to fetch base64 version in background for better PDF quality
            setTimeout(async () => {
                try {
                    const base64Logo = await fetchLogoBase64();
                    if (base64Logo) {
                        const pdfLogoEl = document.getElementById('pdfLogoPreview');
                        pdfLogoEl.src = base64Logo;
                        console.log("Logo base64 loaded successfully");
                    }
                } catch (e) {
                    console.warn("Could not load base64 logo, using regular URL for PDF");
                }
            }, 1000);
        }
    } catch (e) {
        console.warn("Profile load failed:", e);
    }

    /* ================= INVOICE NUMBER ================= */
    try {
        const invRes = await fetch("https://api.dndconsultancytest.com/get-next-invoice.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });
        const inv = await invRes.json();

        if (inv.status) {
            document.getElementById('mobileInvoiceNumber').textContent = inv.invoice;
            document.getElementById('pdfInvoiceNumber').textContent = inv.invoice;
        }
    } catch (e) {
        console.warn("Invoice API failed:", e);
        // Generate a default invoice number
        const defaultInvoice = "INV-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 1000);
        document.getElementById('mobileInvoiceNumber').textContent = defaultInvoice;
        document.getElementById('pdfInvoiceNumber').textContent = defaultInvoice;
    }

    /* ================= LOAD PRODUCTS ================= */
    try {
        const prodRes = await fetch("https://api.dndconsultancytest.com/get-products.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });
        const prod = await prodRes.json();

        if (prod.status) {
            PRODUCT_LIST = prod.data;
            console.log("Products loaded:", PRODUCT_LIST.length);
        }
    } catch (e) {
        console.warn("Products load failed:", e);
        PRODUCT_LIST = [];
    }

    /* ADD TWO EMPTY ROWS */
    addItemRow();
    addItemRow();

    calculateTotals();

    // Auto generate QR code if UPI ID exists and status is unpaid
    autoGenerateQRCode();

    // Update PDF view initially (without triggering updatePaymentStatus)
    updatePDFView(false);
});

/* ================= AUTO GENERATE QR CODE BASED ON STATUS ================= */
function autoGenerateQRCode() {
    const status = document.getElementById('paymentStatus').value;
    const upiId = document.getElementById('mobileUpiId').value.trim();

    if (status === 'unpaid' && upiId) {
        generateQRCode();
    } else if (status === 'paid') {
        // Clear QR codes when paid
        document.getElementById('mobileQrCode').innerHTML = '';
        document.getElementById('pdfQrCode').innerHTML = '';
    }
}

/* ================= HANDLE UPI ID CHANGE ================= */
function handleUpiIdChange() {
    const status = document.getElementById('paymentStatus').value;
    if (status === 'unpaid') {
        generateQRCode();
    }
    // Update PDF view as well
    updatePDFView(false);
}

/* ================= PRODUCT SUGGEST ================= */
function suggestProduct(input) {
    const box = input.parentElement.querySelector('.suggest-box');
    if (!box) return;

    box.innerHTML = "";

    const keyword = input.value.toLowerCase().trim();
    if (keyword.length < 1) {
        box.style.display = 'none';
        return;
    }

    const filteredProducts = PRODUCT_LIST.filter(p =>
        p.product_name && p.product_name.toLowerCase().includes(keyword)
    );

    if (filteredProducts.length === 0) {
        box.style.display = 'none';
        return;
    }

    box.style.display = 'block';

    filteredProducts.forEach(p => {
        const div = document.createElement("div");
        div.className = "suggest-item";
        div.textContent = `${p.product_name} - ₹${parseFloat(p.price).toFixed(2)}`;
        div.onclick = () => {
            input.value = p.product_name;
            const row = input.closest("tr");
            if (row) {
                const priceInput = row.querySelector(".item-price");
                const qtyInput = row.querySelector(".item-qty");
                if (priceInput) {
                    priceInput.value = p.price;
                }
                if (qtyInput) {
                    qtyInput.value = 1;
                }
                const id = row.dataset.id;
                if (id) {
                    updateItemAmount(priceInput, id);
                }
            }
            box.innerHTML = "";
            box.style.display = 'none';
        };
        box.appendChild(div);
    });
}

// Close suggestion box when clicking outside
document.addEventListener('click', function (e) {
    if (!e.target.classList.contains('item-desc')) {
        document.querySelectorAll('.suggest-box').forEach(box => {
            box.innerHTML = "";
            box.style.display = 'none';
        });
    }
});

/* ================= LOGO ================= */
function uploadLogo(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        // Update mobile view
        const mobileLogo = document.getElementById('mobileLogoPreview');
        mobileLogo.src = e.target.result;
        mobileLogo.style.display = "block";
        mobileLogo.parentElement.querySelector('.logo-placeholder').style.display = "none";

        // Update PDF view
        const pdfLogo = document.getElementById('pdfLogoPreview');
        pdfLogo.src = e.target.result;
        pdfLogo.style.display = "block";
    };
    reader.readAsDataURL(file);
}

/* ================= ITEMS ================= */
function addItemRow(description = '', quantity = 1, price = 0) {
    const id = Date.now() + Math.random();
    const body = document.getElementById('mobileItemsBody');

    const tr = document.createElement("tr");
    tr.dataset.id = id;
    tr.innerHTML = `
                <td style="position:relative">
                    <input class="item-desc" value="${description}" autocomplete="off"
                        oninput="suggestProduct(this)"
                        onfocus="suggestProduct(this)"
                        style="width:200px;padding:5px;"/>
                    <div class="suggest-box" style="display:none;"></div>
                </td>
                <td>
                    <input type="number" class="item-qty" value="${quantity}"
                        oninput="updateItemAmount(this,${id})"
                        style="width:100%;border:none;padding:5px;text-align:center;">
                </td>
                <td>
                    <input type="number" class="item-price" value="${price}"
                        oninput="updateItemAmount(this,${id})"
                        style="width:100px;padding:5px;text-align:right;">
                </td>
                <td class="item-amount" style="text-align:right">
                    ₹ ${(quantity * price).toFixed(2)}
                </td>
                <td>
                    <button onclick="removeItem(${id})"
                        style="background:#e74c3c;color:#fff;border:none;
                        padding:5px 10px;border-radius:4px;cursor:pointer;">×</button>
                </td>
            `;
    body.appendChild(tr);

    // Update PDF items
    updatePDFItems();
}

function updateItemAmount(el, id) {
    const row = document.querySelector(`[data-id="${id}"]`);
    if (!row) return;

    const qtyInput = row.querySelector(".item-qty");
    const priceInput = row.querySelector(".item-price");
    const amountCell = row.querySelector(".item-amount");

    const q = parseFloat(qtyInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    const amount = q * p;

    amountCell.textContent = "₹ " + amount.toFixed(2);

    updatePDFItems();
    calculateTotals();
}

function removeItem(id) {
    const row = document.querySelector(`[data-id="${id}"]`);
    if (row) {
        row.remove();
        updatePDFItems();
        calculateTotals();
    }
}

/* ================= PDF ITEMS ================= */
function updatePDFItems() {
    const pdfBody = document.getElementById('pdfItemsBody');
    pdfBody.innerHTML = "";

    document.querySelectorAll("#mobileItemsBody tr").forEach(r => {
        const desc = r.querySelector(".item-desc").value || "";
        const qty = r.querySelector(".item-qty").value || "0";
        const price = r.querySelector(".item-price").value || "0";
        const amount = (parseFloat(qty) * parseFloat(price)).toFixed(2);

        pdfBody.innerHTML += `
                    <tr>
                        <td>${desc}</td>
                        <td style="text-align:center">${qty}</td>
                        <td style="text-align:right">₹ ${parseFloat(price).toFixed(2)}</td>
                        <td style="text-align:right">₹ ${amount}</td>
                    </tr>
                `;
    });
}

/* ================= TOTALS ================= */
function calculateTotals() {
    let subtotal = 0;
    document.querySelectorAll("#mobileItemsBody tr").forEach(r => {
        const q = parseFloat(r.querySelector(".item-qty").value) || 0;
        const p = parseFloat(r.querySelector(".item-price").value) || 0;
        subtotal += q * p;
    });

    const taxPercent = parseFloat(document.getElementById('mobileTaxPercent').value) || 0;
    const taxAmount = subtotal * (taxPercent / 100);
    const total = subtotal + taxAmount;

    // Update mobile view
    document.getElementById('mobileSubtotal').textContent = subtotal.toFixed(2);
    document.getElementById('mobileTaxAmount').textContent = taxAmount.toFixed(2);
    document.getElementById('mobileTotal').textContent = total.toFixed(2);

    // Update PDF view
    document.getElementById('pdfSubtotal').textContent = subtotal.toFixed(2);
    document.getElementById('pdfTaxPercent').textContent = taxPercent;
    document.getElementById('pdfTaxAmount').textContent = taxAmount.toFixed(2);
    document.getElementById('pdfTotal').textContent = total.toFixed(2);

    // Auto generate QR code based on payment status
    autoGenerateQRCode();
}

/* ================= UPDATE PAYMENT STATUS ================= */
function updatePaymentStatus(status, skipPDFUpdate = false) {
    const mobileStatus = document.getElementById('mobileStatus');
    const pdfStatus = document.getElementById('pdfStatus');
    const watermark = document.getElementById('watermark');
    const mobileQrContainer = document.getElementById('mobileQrContainer');
    const pdfPaymentSection = document.getElementById('pdfPaymentSection');
    const paymentStatusSelect = document.getElementById('paymentStatus');

    // Update select value
    paymentStatusSelect.value = status;

    if (status === 'paid') {
        mobileStatus.className = 'status-badge status-paid';
        mobileStatus.textContent = 'PAID';
        pdfStatus.className = 'status-badge status-paid';
        pdfStatus.textContent = 'PAID';
        watermark.style.display = 'block';
        if (mobileQrContainer) mobileQrContainer.style.display = 'none';
        if (pdfPaymentSection) pdfPaymentSection.style.display = 'none';

        // Clear QR codes when paid
        document.getElementById('mobileQrCode').innerHTML = '';
        document.getElementById('pdfQrCode').innerHTML = '';
    } else {
        mobileStatus.className = 'status-badge status-unpaid';
        mobileStatus.textContent = 'UNPAID';
        pdfStatus.className = 'status-badge status-unpaid';
        pdfStatus.textContent = 'UNPAID';
        watermark.style.display = 'none';
        if (mobileQrContainer) mobileQrContainer.style.display = 'block';
        if (pdfPaymentSection) pdfPaymentSection.style.display = 'flex';

        // Generate QR code if UPI ID exists
        const upiId = document.getElementById('mobileUpiId').value.trim();
        if (upiId) {
            generateQRCode();
        }
    }

    // Only update PDF view if not skipping
    if (!skipPDFUpdate && !isUpdatingPDF) {
        updatePDFView(false);
    }
}

/* ================= GENERATE QR CODE ================= */
function generateQRCode() {
    const upiId = document.getElementById('mobileUpiId').value.trim();
    const total = document.getElementById('mobileTotal').textContent;

    // Mobile QR
    const mobileQrDiv = document.getElementById('mobileQrCode');
    const mobileUpiText = document.getElementById('mobileUpiText');

    // PDF QR
    const pdfQrDiv = document.getElementById('pdfQrCode');
    const pdfUpiText = document.getElementById('pdfUpiText');
    const pdfUpiIdSpan = document.getElementById('pdfUpiId');

    if (!upiId) {
        mobileQrDiv.innerHTML = '<div style="padding: 20px; color: #999;">Enter UPI ID</div>';
        mobileUpiText.textContent = '';
        pdfQrDiv.innerHTML = '<div style="padding: 20px; color: #999;">Enter UPI ID</div>';
        pdfUpiText.textContent = '';
        pdfUpiIdSpan.textContent = '';
        return;
    }

    // Update UPI ID text
    mobileUpiText.textContent = upiId;
    pdfUpiText.textContent = upiId;
    pdfUpiIdSpan.textContent = upiId;

    // Clear previous QR codes
    mobileQrDiv.innerHTML = '';
    pdfQrDiv.innerHTML = '';

    // Generate QR for mobile
    new QRCode(mobileQrDiv, {
        text: `upi://pay?pa=${encodeURIComponent(upiId)}&am=${total}&cu=INR`,
        width: 120,
        height: 120,
        colorDark: "#000000",
        colorLight: "#ffffff"
    });

    // Generate QR for PDF
    new QRCode(pdfQrDiv, {
        text: `upi://pay?pa=${encodeURIComponent(upiId)}&am=${total}&cu=INR`,
        width: 100,
        height: 100,
        colorDark: "#000000",
        colorLight: "#ffffff"
    });
}

/* ================= UPDATE PDF VIEW ================= */
function updatePDFView(updatePayment = true) {
    // Prevent recursive calls
    if (isUpdatingPDF) return;
    isUpdatingPDF = true;

    try {
        // Company Info
        document.getElementById('pdfCompanyName').textContent =
            document.getElementById('mobileCompanyName').textContent;
        document.getElementById('pdfCompanyAddress').textContent =
            document.getElementById('mobileCompanyAddress').textContent;
        document.getElementById('pdfCompanyPhone').textContent =
            document.getElementById('mobileCompanyPhone').textContent;
        document.getElementById('pdfCompanyEmail').textContent =
            document.getElementById('mobileCompanyEmail').textContent;

        // Invoice Meta
        document.getElementById('pdfInvoiceNumber').textContent =
            document.getElementById('mobileInvoiceNumber').textContent;
        document.getElementById('pdfInvoiceDate').textContent =
            document.getElementById('mobileInvoiceDate').textContent;

        // Bill To
        document.getElementById('pdfClientName').textContent =
            document.getElementById('mobileClientName').textContent;
        document.getElementById('pdfClientCompany').textContent =
            document.getElementById('mobileClientCompany').textContent;
        document.getElementById('pdfClientAddress').textContent =
            document.getElementById('mobileClientAddress').textContent;
        document.getElementById('pdfClientEmail').textContent =
            document.getElementById('mobileClientEmail').textContent;
        document.getElementById('pdfClientPhone').textContent =
            document.getElementById('mobileClientPhone').textContent;

        // Update UPI ID in PDF
        const upiId = document.getElementById('mobileUpiId').value.trim();
        document.getElementById('pdfUpiId').textContent = upiId || '';
        document.getElementById('pdfUpiText').textContent = upiId || '';

        // Update payment status in PDF only if requested
        if (updatePayment) {
            const status = document.getElementById('paymentStatus').value;
            updatePaymentStatus(status, true); // Skip PDF update to prevent recursion
        }

        // Update items
        updatePDFItems();

        // Update totals
        calculateTotals();

        // Auto generate QR code based on status
        autoGenerateQRCode();
    } finally {
        isUpdatingPDF = false;
    }
}

/* ================= GENERATE PDF ================= */
async function generatePDF() {
    // First update all data in PDF view (without triggering payment status update)
    updatePDFView(false);

    // Ensure PDF logo is loaded properly
    const pdfLogoEl = document.getElementById('pdfLogoPreview');

    // Check if PDF logo is missing or has CORS issues
    if (!pdfLogoEl.src || pdfLogoEl.src.includes('undefined')) {
        try {
            const base64Logo = await fetchLogoBase64();
            if (base64Logo) {
                pdfLogoEl.src = base64Logo;
                pdfLogoEl.style.display = "block";
            }
        } catch (error) {
            console.warn("Failed to load logo for PDF:", error);
        }
    }

    // Show PDF view temporarily
    const pdfView = document.getElementById('pdfView');
    pdfView.style.display = 'block';

    // Configure html2pdf with CORS handling
    const options = {
        margin: 0,
        filename: `invoice_${document.getElementById('pdfInvoiceNumber').textContent}.pdf`,
        image: {
            type: 'jpeg',
            quality: 1
        },
        html2canvas: {
            scale: 3,
            windowWidth: 1200,
            useCORS: true, // Allow cross-origin images
            logging: false,
            backgroundColor: '#ffffff',
            onclone: function (clonedDoc) {
                // Ensure logo is visible in the cloned document
                const clonedLogo = clonedDoc.getElementById('pdfLogoPreview');
                if (clonedLogo && (!clonedLogo.src || clonedLogo.src.includes('undefined'))) {
                    // If logo is still missing, create a fallback
                    const companyName = document.getElementById('mobileCompanyName').textContent;
                    const canvas = document.createElement('canvas');
                    canvas.width = 140;
                    canvas.height = 80;
                    const ctx = canvas.getContext('2d');

                    // Background
                    ctx.fillStyle = '#2c3e50';
                    ctx.fillRect(0, 0, 140, 80);

                    // Text
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const words = companyName.split(' ');
                    if (words.length > 1) {
                        ctx.fillText(words[0], 70, 30);
                        ctx.fillText(words.slice(1).join(' '), 70, 50);
                    } else {
                        ctx.fillText(companyName.substring(0, 10), 70, 40);
                    }

                    clonedLogo.src = canvas.toDataURL('image/png');
                }
            }
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    try {
        await html2pdf()
            .set(options)
            .from(pdfView)
            .save();
    } catch (error) {
        console.error('PDF generation error:', error);

        // Try one more time with simpler options
        try {
            const fallbackOptions = {
                margin: 10,
                filename: `invoice_${document.getElementById('pdfInvoiceNumber').textContent}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true // Allow tainted images
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf()
                .set(fallbackOptions)
                .from(pdfView)
                .save();
        } catch (fallbackError) {
            console.error('Fallback PDF generation error:', fallbackError);
            alert('Error generating PDF. The logo might not appear in the PDF due to CORS restrictions. Try uploading a logo directly using the "Click to upload logo" button.');
        }
    } finally {
        // Hide PDF view again
        pdfView.style.display = 'none';
    }
}