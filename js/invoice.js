 /* ================= GLOBAL ================= */
        const token = localStorage.getItem("token");
        let PRODUCT_LIST = [];
        let isUpdatingPDF = false;
        let currentInvoiceId = null;
        let isSaving = false;
        let logoBase64Cache = null;
        let selectedClient = null;
        let allClients = [];

        // Store current invoice number
        let currentInvoiceNumber = null;

        /* ================= INVOICE NUMBER GENERATION ================= */
        function generateInvoiceNumber() {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const day = String(now.getDate()).padStart(2, '0');
            const randomNum = Math.floor(Math.random() * 90 + 10); // Random 2-digit number

            const invoiceNumber = `INV-${randomNum}-${day}${month}${year}`;
            currentInvoiceNumber = invoiceNumber; // Store it globally
            return invoiceNumber;
        }

        /* ================= ON LOAD ================= */
        document.addEventListener('DOMContentLoaded', async function () {
            if (!token) {
                alert("Please login first");
                window.location.href = "index.html";
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            document.getElementById('mobileInvoiceDate').textContent = today;
            document.getElementById('pdfInvoiceDate').textContent = today;

            // Generate invoice number
            const invoiceNumber = generateInvoiceNumber();
            document.getElementById('mobileInvoiceNumber').textContent = invoiceNumber;
            document.getElementById('pdfInvoiceNumber').textContent = invoiceNumber;

            /* ================= LOAD PROFILE ================= */
            try {
                const res = await fetch("https://api.dndconsultancytest.com/get-profile.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token })
                });
                const profile = await res.json();

                if (profile.status) {
                    document.getElementById('mobileCompanyName').textContent = profile.data.business_name || profile.data.name || "Your Company Name";
                    document.getElementById('mobileCompanyAddress').textContent = profile.data.address || "123 Business Street, City";
                    document.getElementById('mobileCompanyPhone').textContent = profile.data.phone || "Phone: (123) 456-7890";
                    document.getElementById('mobileCompanyEmail').textContent = profile.data.email || "info@company.com";

                    if (profile.data.upi_id) {
                        document.getElementById('mobileUpiId').value = profile.data.upi_id;
                        document.getElementById('pdfUpiId').textContent = profile.data.upi_id;
                        document.getElementById('mobileUpiText').textContent = profile.data.upi_id;
                        document.getElementById('pdfUpiText').textContent = profile.data.upi_id;
                    }

                    if (profile.data.logo) {
                        const mobileLogoEl = document.getElementById('mobileLogoPreview');
                        const mobileLogoPlaceholder = mobileLogoEl.parentElement.querySelector('.logo-placeholder');

                        mobileLogoEl.src = profile.data.logo;
                        mobileLogoEl.style.display = "block";
                        mobileLogoPlaceholder.style.display = "none";

                        const pdfLogoEl = document.getElementById('pdfLogoPreview');
                        pdfLogoEl.src = profile.data.logo;
                        pdfLogoEl.style.display = "block";
                    }

                    setTimeout(async () => {
                        try {
                            const base64Logo = await fetchLogoBase64();
                            if (base64Logo) {
                                const pdfLogoEl = document.getElementById('pdfLogoPreview');
                                pdfLogoEl.src = base64Logo;
                            }
                        } catch (e) {
                            console.warn("Could not load base64 logo");
                        }
                    }, 1000);
                }
            } catch (e) {
                console.warn("Profile load failed:", e);
            }

            /* ================= LOAD CLIENTS ================= */
            await loadAllClients();

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
                }
            } catch (e) {
                PRODUCT_LIST = [];
            }

            addItemRow();
            addItemRow();
            calculateTotals();
            autoGenerateQRCode();
            updatePDFView(false);
        });

        /* ================= LOAD ALL CLIENTS ================= */
        async function loadAllClients() {
            try {
                const response = await fetch("https://api.dndconsultancytest.com/get-clients.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token })
                });

                const result = await response.json();

                if (result.status && result.data.length > 0) {
                    allClients = result.data;
                    console.log(`Loaded ${allClients.length} clients`);
                } else {
                    allClients = [];
                }
            } catch (error) {
                console.warn('Could not load clients:', error);
                allClients = [];
            }
        }

        /* ================= CLIENT SEARCH FUNCTIONS ================= */
        function searchClientByPhone(phoneNumber) {
            const dropdown = document.getElementById('clientDropdown');

            if (!phoneNumber || phoneNumber.trim() === '') {
                dropdown.innerHTML = '';
                dropdown.style.display = 'none';
                return;
            }

            const searchTerm = phoneNumber.toLowerCase().trim();
            const filteredClients = allClients.filter(client =>
                client.client_phone && client.client_phone.toLowerCase().includes(searchTerm)
            );

            if (filteredClients.length === 0) {
                dropdown.innerHTML = '<div class="client-dropdown-item">No clients found</div>';
                dropdown.style.display = 'block';
                return;
            }

            dropdown.innerHTML = '';
            filteredClients.forEach(client => {
                const item = document.createElement('div');
                item.className = 'client-dropdown-item';
                item.innerHTML = `
                    <span>${client.client_name}</span>
                    <span class="client-phone">${client.client_phone || 'No phone'}</span>
                `;
                item.onclick = () => selectClient(client);
                dropdown.appendChild(item);
            });

            dropdown.style.display = 'block';
        }

        function searchClient() {
            const phoneInput = document.getElementById('clientSearchInput').value.trim();
            if (phoneInput) {
                searchClientByPhone(phoneInput);
            }
        }

        function selectClient(client) {
            selectedClient = client;

            // Update client info section
            document.getElementById('selectedClientName').textContent = client.client_name || '-';
            document.getElementById('selectedClientCompany').textContent = client.client_company || '-';
            document.getElementById('selectedClientPhone').textContent = client.client_phone || '-';
            document.getElementById('selectedClientEmail').textContent = client.client_email || '-';
            document.getElementById('selectedClientAddress').textContent = client.client_address || '-';

            // Update bill to fields
            document.getElementById('mobileClientName').textContent = client.client_name || 'Client Name';
            document.getElementById('mobileClientCompany').textContent = client.client_company || 'Client Company';
            document.getElementById('mobileClientAddress').textContent = client.client_address || 'Client Address';
            document.getElementById('mobileClientEmail').textContent = client.client_email ? `Email: ${client.client_email}` : 'Email: client@email.com';
            document.getElementById('mobileClientPhone').textContent = client.client_phone ? `Phone: ${client.client_phone}` : 'Phone: (987) 654-3210';

            // Hide dropdown and show client info
            document.getElementById('clientDropdown').style.display = 'none';
            document.getElementById('clientInfoSection').style.display = 'block';
            document.getElementById('clientSearchInput').value = '';

            // Update PDF view
            updatePDFView(false);
        }

        function clearSelectedClient() {
            selectedClient = null;

            // Clear bill to fields
            document.getElementById('mobileClientName').textContent = 'Client Name';
            document.getElementById('mobileClientCompany').textContent = 'Client Company';
            document.getElementById('mobileClientAddress').textContent = 'Client Address';
            document.getElementById('mobileClientEmail').textContent = 'Email: client@email.com';
            document.getElementById('mobileClientPhone').textContent = 'Phone: (987) 654-3210';

            // Hide client info section
            document.getElementById('clientInfoSection').style.display = 'none';

            // Update PDF view
            updatePDFView(false);
        }

        function editSelectedClient() {
            if (!selectedClient) return;

            document.getElementById('clientFormTitle').textContent = 'Edit Client';
            document.getElementById('formClientName').value = selectedClient.client_name || '';
            document.getElementById('formClientCompany').value = selectedClient.client_company || '';
            document.getElementById('formClientPhone').value = selectedClient.client_phone || '';
            document.getElementById('formClientEmail').value = selectedClient.client_email || '';
            document.getElementById('formClientAddress').value = selectedClient.client_address || '';

            document.getElementById('clientFormModal').style.display = 'flex';
        }

        /* ================= CLIENT FORM FUNCTIONS ================= */
        function showNewClientForm() {
            document.getElementById('clientFormTitle').textContent = 'Add New Client';
            document.getElementById('formClientName').value = '';
            document.getElementById('formClientCompany').value = '';
            document.getElementById('formClientPhone').value = '';
            document.getElementById('formClientEmail').value = '';
            document.getElementById('formClientAddress').value = '';

            document.getElementById('clientFormModal').style.display = 'flex';
        }

        function closeClientForm() {
            document.getElementById('clientFormModal').style.display = 'none';
        }

        async function saveClientFromForm() {
            const clientData = {
                token: token,
                client_name: document.getElementById('formClientName').value.trim(),
                client_company: document.getElementById('formClientCompany').value.trim(),
                client_phone: document.getElementById('formClientPhone').value.trim(),
                client_email: document.getElementById('formClientEmail').value.trim(),
                client_address: document.getElementById('formClientAddress').value.trim()
            };

            if (!clientData.client_name) {
                alert('Client name is required');
                return;
            }

            if (!clientData.client_phone) {
                alert('Phone number is required');
                return;
            }

            try {
                showLoading("Saving Client...");

                const response = await fetch("https://api.dndconsultancytest.com/save-client.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(clientData)
                });

                const result = await response.json();

                if (result.status) {
                    // Reload clients
                    await loadAllClients();

                    // If editing existing client, update selection
                    if (selectedClient && selectedClient.id) {
                        selectedClient = { ...selectedClient, ...clientData };
                        selectClient(selectedClient);
                    } else {
                        // Select the newly saved client
                        const newClient = {
                            client_name: clientData.client_name,
                            client_company: clientData.client_company,
                            client_phone: clientData.client_phone,
                            client_email: clientData.client_email,
                            client_address: clientData.client_address,
                            id: result.client_id
                        };
                        selectClient(newClient);
                    }

                    closeClientForm();
                    hideLoading();
                    alert('Client saved successfully!');
                } else {
                    throw new Error(result.message || 'Failed to save client');
                }
            } catch (error) {
                hideLoading();
                alert('Error saving client: ' + error.message);
            }
        }

        /* ================= AUTO GENERATE QR CODE ================= */
        function autoGenerateQRCode() {
            const status = document.getElementById('paymentStatus').value;
            const upiId = document.getElementById('mobileUpiId').value.trim();

            if (status === 'unpaid' && upiId) {
                generateQRCode();
            } else if (status === 'paid') {
                document.getElementById('mobileQrCode').innerHTML = '';
                document.getElementById('pdfQrCode').innerHTML = '';
            }
        }

        function handleUpiIdChange() {
            const status = document.getElementById('paymentStatus').value;
            if (status === 'unpaid') {
                generateQRCode();
            }
            updatePDFView(false);
        }

        /* ================= LOGO FUNCTIONS ================= */
        async function fetchLogoBase64() {
            if (!token) return null;

            if (logoBase64Cache) {
                return logoBase64Cache;
            }

            try {
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

                if (logoUrl.startsWith('data:')) {
                    logoBase64Cache = logoUrl;
                    return logoUrl;
                }

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
                return null;
            }
        }

        function uploadLogo(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = e => {
                const mobileLogo = document.getElementById('mobileLogoPreview');
                mobileLogo.src = e.target.result;
                mobileLogo.style.display = "block";
                mobileLogo.parentElement.querySelector('.logo-placeholder').style.display = "none";

                const pdfLogo = document.getElementById('pdfLogoPreview');
                pdfLogo.src = e.target.result;
                pdfLogo.style.display = "block";
            };
            reader.readAsDataURL(file);
        }

        /* ================= ITEMS FUNCTIONS ================= */
        function addItemRow(description = '', quantity = 1, price = 0) {
            const id = Date.now() + Math.random();
            const body = document.getElementById('mobileItemsBody');

            const tr = document.createElement("tr");
            tr.dataset.id = id;
            tr.innerHTML = `
                <td style="position:relative">
                    <input class="item-desc" value="${description}" autocomplete="off"
                        oninput="suggestProductOnInput(this)"
                        onfocus="suggestProductOnFocus(this)"
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

        /* ================= PRODUCT SUGGESTION FUNCTIONS ================= */
        function suggestProductOnInput(input) {
            const keyword = input.value.trim();

            // Clear suggestions if input is empty
            if (keyword.length === 0) {
                hideSuggestBox(input);
                return;
            }

            // Only show suggestions after 3 characters
            if (keyword.length >= 3) {
                showProductSuggestions(input, keyword);
            } else {
                hideSuggestBox(input);
            }
        }

        function suggestProductOnFocus(input) {
            const keyword = input.value.trim();
            if (keyword.length >= 3) {
                showProductSuggestions(input, keyword);
            }
        }

        function showProductSuggestions(input, keyword) {
            const box = input.parentElement.querySelector('.suggest-box');
            if (!box) return;

            const filteredProducts = PRODUCT_LIST.filter(p =>
                p.product_name && p.product_name.toLowerCase().includes(keyword.toLowerCase())
            );

            if (filteredProducts.length === 0) {
                box.innerHTML = '<div class="suggest-item">No matching products found</div>';
                box.style.display = 'block';
                return;
            }

            box.innerHTML = '';
            filteredProducts.forEach(p => {
                const div = document.createElement("div");
                div.className = "suggest-item";
                div.innerHTML = `
                    <strong>${p.product_name}</strong>
                    <span style="color: #27ae60; font-size: 12px;">₹${parseFloat(p.price).toFixed(2)}</span>
                `;
                div.onclick = () => {
                    input.value = p.product_name;
                    const row = input.closest("tr");
                    if (row) {
                        const priceInput = row.querySelector(".item-price");
                        const qtyInput = row.querySelector(".item-qty");
                        if (priceInput) priceInput.value = p.price;
                        if (qtyInput) qtyInput.value = 1;
                        const id = row.dataset.id;
                        if (id) updateItemAmount(priceInput, id);
                    }
                    hideSuggestBox(input);
                };
                box.appendChild(div);
            });

            box.style.display = 'block';
        }

        function hideSuggestBox(input) {
            const box = input.parentElement.querySelector('.suggest-box');
            if (box) {
                box.style.display = 'none';
                box.innerHTML = '';
            }
        }

        // Close suggestions when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.classList.contains('item-desc')) {
                document.querySelectorAll('.suggest-box').forEach(box => {
                    box.style.display = 'none';
                    box.innerHTML = '';
                });
            }
        });

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

            document.getElementById('mobileSubtotal').textContent = subtotal.toFixed(2);
            document.getElementById('mobileTaxAmount').textContent = taxAmount.toFixed(2);
            document.getElementById('mobileTotal').textContent = total.toFixed(2);

            document.getElementById('pdfSubtotal').textContent = subtotal.toFixed(2);
            document.getElementById('pdfTaxPercent').textContent = taxPercent;
            document.getElementById('pdfTaxAmount').textContent = taxAmount.toFixed(2);
            document.getElementById('pdfTotal').textContent = total.toFixed(2);

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

            paymentStatusSelect.value = status;

            if (status === 'paid') {
                mobileStatus.className = 'status-badge status-paid';
                mobileStatus.textContent = 'PAID';
                pdfStatus.className = 'status-badge status-paid';
                pdfStatus.textContent = 'PAID';
                watermark.style.display = 'block';
                if (mobileQrContainer) mobileQrContainer.style.display = 'none';
                if (pdfPaymentSection) pdfPaymentSection.style.display = 'none';
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
                const upiId = document.getElementById('mobileUpiId').value.trim();
                if (upiId) generateQRCode();
            }

            if (!skipPDFUpdate && !isUpdatingPDF) {
                updatePDFView(false);
            }
        }

        /* ================= GENERATE QR CODE ================= */
        function generateQRCode() {
            const upiId = document.getElementById('mobileUpiId').value.trim();
            const total = document.getElementById('mobileTotal').textContent;

            const mobileQrDiv = document.getElementById('mobileQrCode');
            const mobileUpiText = document.getElementById('mobileUpiText');
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

            mobileUpiText.textContent = upiId;
            pdfUpiText.textContent = upiId;
            pdfUpiIdSpan.textContent = upiId;

            mobileQrDiv.innerHTML = '';
            pdfQrDiv.innerHTML = '';

            new QRCode(mobileQrDiv, {
                text: `upi://pay?pa=${encodeURIComponent(upiId)}&am=${total}&cu=INR`,
                width: 120,
                height: 120,
                colorDark: "#000000",
                colorLight: "#ffffff"
            });

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
            if (isUpdatingPDF) return;
            isUpdatingPDF = true;

            try {
                // FIX: Ensure PDF view gets the complete invoice number
                const mobileInvoiceNumber = document.getElementById('mobileInvoiceNumber').textContent;
                const pdfInvoiceNumber = document.getElementById('pdfInvoiceNumber');

                // Always update PDF invoice number from mobile view
                pdfInvoiceNumber.textContent = mobileInvoiceNumber;

                // Update other fields
                document.getElementById('pdfCompanyName').textContent =
                    document.getElementById('mobileCompanyName').textContent;
                document.getElementById('pdfCompanyAddress').textContent =
                    document.getElementById('mobileCompanyAddress').textContent;
                document.getElementById('pdfCompanyPhone').textContent =
                    document.getElementById('mobileCompanyPhone').textContent;
                document.getElementById('pdfCompanyEmail').textContent =
                    document.getElementById('mobileCompanyEmail').textContent;

                document.getElementById('pdfInvoiceDate').textContent =
                    document.getElementById('mobileInvoiceDate').textContent;

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

                const upiId = document.getElementById('mobileUpiId').value.trim();
                document.getElementById('pdfUpiId').textContent = upiId || '';
                document.getElementById('pdfUpiText').textContent = upiId || '';

                if (updatePayment) {
                    const status = document.getElementById('paymentStatus').value;
                    updatePaymentStatus(status, true);
                }

                updatePDFItems();
                calculateTotals();
                autoGenerateQRCode();
            } finally {
                isUpdatingPDF = false;
            }
        }

        /* ================= SHOW/HIDE LOADING ================= */
        function showLoading(message = "Processing...") {
            document.getElementById('loadingText').textContent = message;
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }

        /* ================= SAVE INVOICE ================= */
        async function saveInvoice(showAlert = true) {
            // Prevent multiple simultaneous saves
            if (isSaving) {
                console.log('Already saving, please wait...');
                return false;
            }

            isSaving = true;
            let savedSuccessfully = false;

            try {
                const clientName = document.getElementById('mobileClientName').textContent.trim();
                const clientEmail = document.getElementById('mobileClientEmail').textContent.replace('Email:', '').trim();
                const invoiceNumber = document.getElementById('mobileInvoiceNumber').textContent.trim();

                if (!clientName) {
                    alert('Please enter client name');
                    document.getElementById('mobileClientName').focus();
                    isSaving = false;
                    return false;
                }

                if (!invoiceNumber) {
                    alert('Please enter invoice number');
                    document.getElementById('mobileInvoiceNumber').focus();
                    isSaving = false;
                    return false;
                }

                // Collect client data
                const clientData = {
                    token: token,
                    client_name: clientName,
                    client_company: document.getElementById('mobileClientCompany').textContent.trim(),
                    client_address: document.getElementById('mobileClientAddress').textContent.trim(),
                    client_email: clientEmail,
                    client_phone: document.getElementById('mobileClientPhone').textContent.replace('Phone:', '').trim()
                };

                // First, save or update client
                let clientId = null;
                try {
                    const clientResponse = await fetch("https://api.dndconsultancytest.com/save-client.php", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(clientData)
                    });

                    const clientResult = await clientResponse.json();

                    if (clientResult.status) {
                        clientId = clientResult.client_id;
                        console.log('Client saved with ID:', clientId);

                        // Update the selected client if it exists
                        if (selectedClient) {
                            selectedClient.id = clientId;
                        }
                    } else {
                        console.warn('Client save warning:', clientResult.message);
                    }
                } catch (clientError) {
                    console.warn('Client save error:', clientError);
                }

                // Collect invoice items
                const items = [];
                document.querySelectorAll("#mobileItemsBody tr").forEach(r => {
                    const desc = r.querySelector(".item-desc").value.trim();
                    const qty = parseFloat(r.querySelector(".item-qty").value) || 0;
                    const price = parseFloat(r.querySelector(".item-price").value) || 0;

                    if (desc && qty > 0 && price > 0) {
                        items.push({
                            description: desc,
                            quantity: qty,
                            unit_price: price,
                            total_price: qty * price
                        });
                    }
                });

                if (items.length === 0) {
                    alert('Please add at least one item to the invoice');
                    isSaving = false;
                    return false;
                }

                // Prepare invoice data
                const invoiceData = {
                    token: token,
                    client_name: clientName,
                    client_company: document.getElementById('mobileClientCompany').textContent.trim(),
                    client_address: document.getElementById('mobileClientAddress').textContent.trim(),
                    client_email: clientEmail,
                    client_phone: document.getElementById('mobileClientPhone').textContent.replace('Phone:', '').trim(),
                    client_id: clientId,
                    invoice_number: invoiceNumber,
                    invoice_date: document.getElementById('mobileInvoiceDate').textContent.trim(),
                    status: document.getElementById('paymentStatus').value,
                    subtotal: parseFloat(document.getElementById('mobileSubtotal').textContent) || 0,
                    tax_percent: parseFloat(document.getElementById('mobileTaxPercent').value) || 0,
                    tax_amount: parseFloat(document.getElementById('mobileTaxAmount').textContent) || 0,
                    total_amount: parseFloat(document.getElementById('mobileTotal').textContent) || 0,
                    upi_id: document.getElementById('mobileUpiId').value.trim(),
                    items: items
                };

                // Show loading
                showLoading("Saving Invoice...");
                const saveBtn = document.querySelector('.btn-save');
                const originalText = saveBtn.textContent;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                saveBtn.disabled = true;

                // Save invoice with retry logic
                let retries = 3;
                let result = null;

                while (retries > 0) {
                    try {
                        const response = await fetch("https://api.dndconsultancytest.com/save-invoice.php", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(invoiceData)
                        });

                        result = await response.json();

                        if (result.status) {
                            break;
                        } else if (retries > 1) {
                            console.warn(`Save failed, retrying... (${retries - 1} attempts left)`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } catch (error) {
                        console.error(`Save attempt ${4 - retries} failed:`, error);
                        if (retries > 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                    retries--;
                }

                if (result && result.status) {
                    currentInvoiceId = result.invoice_id;

                    // FIX: Update invoice number in both views if server returns different number
                    if (invoiceNumber !== result.invoice_number && result.invoice_number) {
                        // Update both views with the server's invoice number
                        document.getElementById('mobileInvoiceNumber').textContent = result.invoice_number;
                        document.getElementById('pdfInvoiceNumber').textContent = result.invoice_number;
                    }

                    // Always update PDF view after save
                    updatePDFView(false);

                    if (showAlert) {
                        alert('Invoice saved successfully!');
                    }

                    savedSuccessfully = true;
                } else {
                    throw new Error(result ? result.message : 'Failed to save invoice after multiple attempts');
                }

            } catch (error) {
                console.error('Save invoice error:', error);
                alert('Error saving invoice: ' + error.message);
            } finally {
                // Reset button and hide loading
                hideLoading();
                const saveBtn = document.querySelector('.btn-save');
                saveBtn.textContent = 'Save Invoice';
                saveBtn.disabled = false;
                isSaving = false;
            }

            return savedSuccessfully;
        }

        /* ================= SAVE AND DOWNLOAD PDF ================= */
        async function saveAndDownload() {
            showLoading("Preparing PDF...");

            try {
                // First save the invoice
                const saved = await saveInvoice(false);

                if (!saved) {
                    hideLoading();
                    alert('Failed to save invoice. Please try again.');
                    return;
                }

                // Update loading message
                document.getElementById('loadingText').textContent = "Generating PDF...";

                // Now generate PDF
                await generatePDF();

            } catch (error) {
                console.error('PDF download error:', error);
                alert('Error: ' + error.message);
            } finally {
                hideLoading();
            }
        }

        /* ================= GENERATE PDF ================= */
        async function generatePDF() {
            // FIX: Ensure PDF view is updated with current data
            updatePDFView(false);

            const pdfLogoEl = document.getElementById('pdfLogoPreview');
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

            const pdfView = document.getElementById('pdfView');
            pdfView.style.display = 'block';

            // FIX: Get invoice number from PDF view (not mobile view) for filename
            const invoiceNumber = document.getElementById('pdfInvoiceNumber').textContent;
            console.log("Generating PDF for invoice:", invoiceNumber); // Debug log

            const options = {
                margin: 0,
                filename: `invoice_${invoiceNumber}.pdf`,
                image: {
                    type: 'jpeg',
                    quality: 1
                },
                html2canvas: {
                    scale: 3,
                    windowWidth: 1200,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    onclone: function (clonedDoc) {
                        const clonedLogo = clonedDoc.getElementById('pdfLogoPreview');
                        if (clonedLogo && (!clonedLogo.src || clonedLogo.src.includes('undefined'))) {
                            const companyName = document.getElementById('mobileCompanyName').textContent;
                            const canvas = document.createElement('canvas');
                            canvas.width = 140;
                            canvas.height = 80;
                            const ctx = canvas.getContext('2d');

                            ctx.fillStyle = '#2c3e50';
                            ctx.fillRect(0, 0, 140, 80);

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

                        // FIX: Double-check invoice number in cloned document
                        const clonedInvoiceNumber = clonedDoc.getElementById('pdfInvoiceNumber');
                        if (clonedInvoiceNumber) {
                            console.log("Cloned invoice number:", clonedInvoiceNumber.textContent);
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

                try {
                    const fallbackOptions = {
                        margin: 10,
                        filename: `invoice_${invoiceNumber}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: {
                            scale: 2,
                            useCORS: true,
                            allowTaint: true
                        },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    await html2pdf()
                        .set(fallbackOptions)
                        .from(pdfView)
                        .save();
                } catch (fallbackError) {
                    console.error('Fallback PDF generation error:', fallbackError);
                    alert('Error generating PDF. The logo might not appear in the PDF due to CORS restrictions.');
                }
            } finally {
                pdfView.style.display = 'none';
            }
        }