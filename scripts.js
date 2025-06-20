// Global variables to store data between steps
let workspaces = [];
let boardsData = [];

// Show loading spinner
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

// Hide loading spinner
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show a specific step and hide others
function showStep(stepNumber) {
    for (let i = 1; i <= 3; i++) {
        const element = document.getElementById(`step${i}`);
        if (i === stepNumber) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    }
}

// Go back to a previous step
function backToStep(stepNumber) {
    showStep(stepNumber);
}

// Fetch workspaces for the authenticated user
async function fetchWorkspaces() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiToken = document.getElementById('apiToken').value.trim();
    
    if (!apiKey || !apiToken) {
        alert('Please enter both API Key and Token');
        return;
    }
    
    showLoading();
    
    try {
        // First get the member's own data to find workspaces
        const memberResponse = await fetch(`https://api.trello.com/1/members/me?key=${apiKey}&token=${apiToken}`);
        const memberData = await memberResponse.json();
        
        // Then get the organizations (workspaces) the member belongs to
        const orgsResponse = await fetch(`https://api.trello.com/1/members/me/organizations?key=${apiKey}&token=${apiToken}`);
        workspaces = await orgsResponse.json();
        
        const workspaceSelect = document.getElementById('workspaceSelect');
        workspaceSelect.innerHTML = '';
        
        if (workspaces.length === 0) {
            workspaceSelect.innerHTML = '<option value="">No workspaces found</option>';
        } else {
            workspaces.forEach(workspace => {
                const option = document.createElement('option');
                option.value = workspace.id;
                option.textContent = workspace.displayName;
                workspaceSelect.appendChild(option);
            });
        }
        
        hideLoading();
        showStep(2);
    } catch (error) {
        hideLoading();
        console.error
