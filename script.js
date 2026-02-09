const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;


window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};



function loadFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            window.db = JSON.parse(stored);
        } else {
            // Seed initial data
            seedDatabase();
        }
    } catch (error) {
        console.error('Error loading from storage:', error);
        seedDatabase();
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function seedDatabase() {
    window.db = {
        accounts: [
            {
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'admin',
                verified: true
            }
        ],
        departments: [
            {
                id: 1,
                name: 'Engineering',
                description: 'Software development and IT'
            },
            {
                id: 2,
                name: 'HR',
                description: 'Human Resources'
            }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}
// ========================================
// ROUTING FUNCTIONS
// ========================================

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2); // Remove '#/'
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Protected routes (require authentication)
    const protectedRoutes = ['profile', 'requests'];
    const adminRoutes = ['employees', 'accounts', 'departments'];
    
    // Check authentication for protected routes
    if (protectedRoutes.includes(route) && !currentUser) {
        navigateTo('#/login');
        showToast('Please login to access this page', 'warning');
        return;
    }
    
    // Check admin access
    if (adminRoutes.includes(route)) {
        if (!currentUser) {
            navigateTo('#/login');
            showToast('Please login to access this page', 'warning');
            return;
        }
        if (currentUser.role !== 'admin') {
            navigateTo('#/');
            showToast('Access denied. Admin privileges required.', 'danger');
            return;
        }
    }
    
    // Show the appropriate page
    let pageId = route ? `${route}-page` : 'home-page';
    const page = document.getElementById(pageId);
    
    if (page) {
        page.classList.add('active');
        
        // Call render functions based on route
        switch(route) {
            case 'profile':
                renderProfile();
                break;
            case 'accounts':
                renderAccountsList();
                break;
            case 'employees':
                renderEmployeesTable();
                break;
            case 'departments':
                renderDepartmentsList();
                break;
            case 'requests':
                renderRequestsList();
                break;
        }
    } else {
        // Route not found, go home
        document.getElementById('home-page').classList.add('active');
    }
}

// Listen for hash changes
window.addEventListener('hashchange', handleRouting);

// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================

function setAuthState(isAuth, user = null) {
    currentUser = user;
    const body = document.body;
    
    if (isAuth && user) {
        // User is logged in
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        
        // Check if admin
        if (user.role === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
        
        // Update username display
        document.getElementById('username-display').textContent = 
            `${user.firstName} ${user.lastName}`;
    } else {
        // User is logged out
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
        currentUser = null;
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    
    // Check if email already exists
    const existingAccount = window.db.accounts.find(acc => acc.email === email);
    if (existingAccount) {
        showToast('Email already registered', 'danger');
        return;
    }
    
    // Create new account
    const newAccount = {
        id: window.db.accounts.length + 1,
        firstName,
        lastName,
        email,
        password,
        role: 'user',
        verified: false
    };
    
    window.db.accounts.push(newAccount);
    saveToStorage();
    
    // Store unverified email
    localStorage.setItem('unverified_email', email);
    
    // Navigate to verification page
    showToast('Registration successful! Please verify your email.', 'success');
    navigateTo('#/verify-email');
    
    // Update verification display
    document.getElementById('verify-email-display').textContent = email;
    
    // Reset form
    document.getElementById('register-form').reset();
}

function handleSimulateVerify() {
    const email = localStorage.getItem('unverified_email');
    if (!email) {
        showToast('No pending verification found', 'warning');
        return;
    }
    
    // Find and verify the account
    const account = window.db.accounts.find(acc => acc.email === email);
    if (account) {
        account.verified = true;
        saveToStorage();
        localStorage.removeItem('unverified_email');
        showToast('Email verified successfully! You can now login.', 'success');
        navigateTo('#/login');
    } else {
        showToast('Account not found', 'danger');
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    
    // Find matching account
    const account = window.db.accounts.find(acc => 
        acc.email === email && 
        acc.password === password && 
        acc.verified === true
    );
    
    const errorDiv = document.getElementById('login-error');
    
    if (account) {
        // Login successful
        localStorage.setItem('auth_token', email);
        setAuthState(true, account);
        showToast(`Welcome back, ${account.firstName}!`, 'success');
        navigateTo('#/profile');
        document.getElementById('login-form').reset();
        errorDiv.classList.add('d-none');
    } else {
        // Login failed
        errorDiv.textContent = 'Invalid email or password, or email not verified.';
        errorDiv.classList.remove('d-none');
    }
}

function handleLogout() {
    localStorage.removeItem('auth_token');
    setAuthState(false);
    showToast('Logged out successfully', 'info');
    navigateTo('#/');
}

function checkExistingAuth() {
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        // Find the user
        const user = window.db.accounts.find(acc => acc.email === authToken);
        if (user && user.verified) {
            setAuthState(true, user);
        } else {
            // Invalid token
            localStorage.removeItem('auth_token');
        }
    }
}

// ========================================
// UI HELPER FUNCTIONS
// ========================================

function showToast(message, type = 'info') {
    const toastElement = document.getElementById('toast');
    const toastBody = document.getElementById('toast-message');
    
    // Set message
    toastBody.textContent = message;
    
    // Set color based on type
    toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
    toastElement.classList.add(`bg-${type}`, 'text-white');
    
    // Show toast
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

function generateId(array) {
    return array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;
}

// ========================================
// PROFILE PAGE
// ========================================

function renderProfile() {
    if (!currentUser) return;
    
    const container = document.getElementById('profile-content');
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>First Name:</strong> ${currentUser.firstName}</p>
                <p><strong>Last Name:</strong> ${currentUser.lastName}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Role:</strong> <span class="badge bg-${currentUser.role === 'admin' ? 'danger' : 'primary'}">${currentUser.role}</span></p>
                <p><strong>Verified:</strong> ${currentUser.verified ? '✅ Yes' : '❌ No'}</p>
            </div>
        </div>
        <button class="btn btn-primary mt-3" onclick="alert('Edit profile feature coming soon!')">Edit Profile</button>
    `;
}
// ========================================
// ACCOUNTS PAGE (ADMIN)
// ========================================

function renderAccountsList() {
    const container = document.getElementById('accounts-table-container');
    
    let html = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    window.db.accounts.forEach(account => {
        html += `
            <tr>
                <td>${account.firstName} ${account.lastName}</td>
                <td>${account.email}</td>
                <td><span class="badge bg-${account.role === 'admin' ? 'danger' : 'primary'}">${account.role}</span></td>
                <td>${account.verified ? '✅' : '❌'}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editAccount(${account.id})">Edit</button>
                    <button class="btn btn-sm btn-info" onclick="resetPassword(${account.id})">Reset PW</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAccount(${account.id})">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function showAddAccountModal() {
    const modalHTML = `
        <div class="modal fade" id="accountModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Account</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="account-form">
                            <input type="hidden" id="account-id">
                            <div class="mb-3">
                                <label class="form-label">First Name</label>
                                <input type="text" class="form-control" id="account-firstname" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Last Name</label>
                                <input type="text" class="form-control" id="account-lastname" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" id="account-email" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" id="account-password" minlength="6" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Role</label>
                                <select class="form-select" id="account-role" required>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="account-verified">
                                <label class="form-check-label" for="account-verified">Verified</label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveAccount()">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHTML;
    const modal = new bootstrap.Modal(document.getElementById('accountModal'));
    modal.show();
}

function editAccount(id) {
    const account = window.db.accounts.find(acc => acc.id === id);
    if (!account) return;
    
    showAddAccountModal();
    
    // Pre-fill form
    document.getElementById('account-id').value = account.id;
    document.getElementById('account-firstname').value = account.firstName;
    document.getElementById('account-lastname').value = account.lastName;
    document.getElementById('account-email').value = account.email;
    document.getElementById('account-password').value = account.password;
    document.getElementById('account-role').value = account.role;
    document.getElementById('account-verified').checked = account.verified;
    
    document.querySelector('#accountModal .modal-title').textContent = 'Edit Account';
}

function saveAccount() {
    const id = document.getElementById('account-id').value;
    const firstName = document.getElementById('account-firstname').value.trim();
    const lastName = document.getElementById('account-lastname').value.trim();
    const email = document.getElementById('account-email').value.trim().toLowerCase();
    const password = document.getElementById('account-password').value;
    const role = document.getElementById('account-role').value;
    const verified = document.getElementById('account-verified').checked;
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }
    
    if (id) {
        // Edit existing
        const account = window.db.accounts.find(acc => acc.id === parseInt(id));
        if (account) {
            account.firstName = firstName;
            account.lastName = lastName;
            account.email = email;
            account.password = password;
            account.role = role;
            account.verified = verified;
            showToast('Account updated successfully', 'success');
        }
    } else {
        // Add new
        const newAccount = {
            id: generateId(window.db.accounts),
            firstName,
            lastName,
            email,
            password,
            role,
            verified
        };
        window.db.accounts.push(newAccount);
        showToast('Account created successfully', 'success');
    }
    
    saveToStorage();
    renderAccountsList();
    bootstrap.Modal.getInstance(document.getElementById('accountModal')).hide();
}

function resetPassword(id) {
    const account = window.db.accounts.find(acc => acc.id === id);
    if (!account) return;
    
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (newPassword && newPassword.length >= 6) {
        account.password = newPassword;
        saveToStorage();
        showToast('Password reset successfully', 'success');
    } else if (newPassword) {
        showToast('Password must be at least 6 characters', 'danger');
    }
}

function deleteAccount(id) {
    // Prevent self-deletion
    if (currentUser && currentUser.id === id) {
        showToast('You cannot delete your own account', 'danger');
        return;
    }
    
    if (confirm('Are you sure you want to delete this account?')) {
        window.db.accounts = window.db.accounts.filter(acc => acc.id !== id);
        saveToStorage();
        showToast('Account deleted successfully', 'success');
        renderAccountsList();
    }
}
// ========================================
// DEPARTMENTS PAGE (ADMIN)
// ========================================

function renderDepartmentsList() {
    const container = document.getElementById('departments-table-container');
    
    let html = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    window.db.departments.forEach(dept => {
        html += `
            <tr>
                <td>${dept.name}</td>
                <td>${dept.description}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editDepartment(${dept.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${dept.id})">Delete</button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function showAddDepartmentModal() {
    const modalHTML = `
        <div class="modal fade" id="departmentModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Department</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="department-form">
                            <input type="hidden" id="department-id">
                            <div class="mb-3">
                                <label class="form-label">Department Name</label>
                                <input type="text" class="form-control" id="department-name" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Description</label>
                                <textarea class="form-control" id="department-description" rows="3" required></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveDepartment()">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHTML;
    const modal = new bootstrap.Modal(document.getElementById('departmentModal'));
    modal.show();
}

function editDepartment(id) {
    const dept = window.db.departments.find(d => d.id === id);
    if (!dept) return;
    
    showAddDepartmentModal();
    
    document.getElementById('department-id').value = dept.id;
    document.getElementById('department-name').value = dept.name;
    document.getElementById('department-description').value = dept.description;
    
    document.querySelector('#departmentModal .modal-title').textContent = 'Edit Department';
}

function saveDepartment() {
    const id = document.getElementById('department-id').value;
    const name = document.getElementById('department-name').value.trim();
    const description = document.getElementById('department-description').value.trim();
    
    if (id) {
        // Edit existing
        const dept = window.db.departments.find(d => d.id === parseInt(id));
        if (dept) {
            dept.name = name;
            dept.description = description;
            showToast('Department updated successfully', 'success');
        }
    } else {
        // Add new
        const newDept = {
            id: generateId(window.db.departments),
            name,
            description
        };
        window.db.departments.push(newDept);
        showToast('Department created successfully', 'success');
    }
    
    saveToStorage();
    renderDepartmentsList();
    bootstrap.Modal.getInstance(document.getElementById('departmentModal')).hide();
}

function deleteDepartment(id) {
    if (confirm('Are you sure you want to delete this department?')) {
        window.db.departments = window.db.departments.filter(d => d.id !== id);
        saveToStorage();
        showToast('Department deleted successfully', 'success');
        renderDepartmentsList();
    }
}
// ========================================
// EMPLOYEES PAGE (ADMIN)
// ========================================

function renderEmployeesTable() {
    const container = document.getElementById('employees-table-container');
    
    let html = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Hire Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    window.db.employees.forEach(emp => {
        const user = window.db.accounts.find(acc => acc.id === emp.userId);
        const dept = window.db.departments.find(d => d.id === emp.departmentId);
        
        html += `
            <tr>
                <td>${emp.employeeId}</td>
                <td>${user ? user.email : 'Unknown'}</td>
                <td>${emp.position}</td>
                <td>${dept ? dept.name : 'Unknown'}</td>
                <td>${emp.hireDate}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editEmployee(${emp.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
                </td>
            </tr>
        `;
    });
    
    if (window.db.employees.length === 0) {
        html += `<tr><td colspan="6" class="text-center">No employees found</td></tr>`;
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function showAddEmployeeModal() {
    const modalHTML = `
        <div class="modal fade" id="employeeModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Employee</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="employee-form">
                            <input type="hidden" id="employee-db-id">
                            <div class="mb-3">
                                <label class="form-label">Employee ID</label>
                                <input type="text" class="form-control" id="employee-id" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">User Email</label>
                                <select class="form-select" id="employee-user" required>
                                    <option value="">Select User...</option>
                                    ${window.db.accounts.map(acc => 
                                        `<option value="${acc.id}">${acc.email} (${acc.firstName} ${acc.lastName})</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Position</label>
                                <input type="text" class="form-control" id="employee-position" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Department</label>
                                <select class="form-select" id="employee-department" required>
                                    <option value="">Select Department...</option>
                                    ${window.db.departments.map(dept => 
                                        `<option value="${dept.id}">${dept.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Hire Date</label>
                                <input type="date" class="form-control" id="employee-hiredate" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveEmployee()">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modal-container').innerHTML = modalHTML;
    const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
    modal.show();
}

function editEmployee(id) {
    const emp = window.db.employees.find(e => e.id === id);
    if (!emp) return;
    
    showAddEmployeeModal();
    
    document.getElementById('employee-db-id').value = emp.id;
    document.getElementById('employee-id').value = emp.employeeId;
    document.getElementById('employee-user').value = emp.userId;
    document.getElementById('employee-position').value = emp.position;
    document.getElementById('employee-department').value = emp.departmentId;
    document.getElementById('employee-hiredate').value = emp.hireDate;
    
    document.querySelector('#employeeModal .modal-title').textContent = 'Edit Employee';
}

function saveEmployee() {
    const dbId = document.getElementById('employee-db-id').value;
    const employeeId = document.getElementById('employee-id').value.trim();
    const userId = parseInt(document.getElementById('employee-user').value);
    const position = document.getElementById('employee-position').value.trim();
    const departmentId = parseInt(document.getElementById('employee-department').value);
    const hireDate = document.getElementById('employee-hiredate').value;
    
    if (!userId || !departmentId) {
        showToast('Please select both user and department', 'danger');
        return;
    }
    
    if (dbId) {
        // Edit existing
        const emp = window.db.employees.find(e => e.id === parseInt(dbId));
        if (emp) {
            emp.employeeId = employeeId;
            emp.userId = userId;
            emp.position = position;
            emp.departmentId = departmentId;
            emp.hireDate = hireDate;
            showToast('Employee updated successfully', 'success');
        }
    } else {
        // Add new
        const newEmp = {
            id: generateId(window.db.employees),
            employeeId,
            userId,
            position,
            departmentId,
            hireDate
        };
        window.db.employees.push(newEmp);
        showToast('Employee created successfully', 'success');
    }
    
    saveToStorage();
    renderEmployeesTable();
    bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
}

function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        window.db.employees = window.db.employees.filter(e => e.id !== id);
        saveToStorage();
        showToast('Employee deleted successfully', 'success');
        renderEmployeesTable();
    }
}
// ========================================
// EVENT LISTENERS
// ========================================

function initializeEventListeners() {
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Simulate verify button
    const verifyBtn = document.getElementById('simulate-verify-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleSimulateVerify);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Add Account button
    const addAccountBtn = document.getElementById('add-account-btn');
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', showAddAccountModal);
    }
    
    // Add Department button
    const addDepartmentBtn = document.getElementById('add-department-btn');
    if (addDepartmentBtn) {
        addDepartmentBtn.addEventListener('click', showAddDepartmentModal);
    }
    
    // Add Employee button
    const addEmployeeBtn = document.getElementById('add-employee-btn');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', showAddEmployeeModal);
    }
    
    // Add Request button
    const addRequestBtn = document.getElementById('add-request-btn');
    if (addRequestBtn) {
        addRequestBtn.addEventListener('click', showAddRequestModal);
    }
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
    // Load data from storage
    loadFromStorage();
    
    // Check for existing authentication
    checkExistingAuth();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Set initial hash if empty
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    
    // Handle initial route
    handleRouting();
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);

