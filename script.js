// Global variables to store data between steps
let workspaceId = '';
let workspaceName = '';
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
    for (let i = 1; i <= 4; i++) {
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

// Validate API credentials by making a simple request
async function validateCredentials() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiToken = document.getElementById('apiToken').value.trim();
    
    if (!apiKey || !apiToken) {
        alert('Please enter both API Key and Token');
        return;
    }
    
    showLoading();
    
    try {
        // Make a simple request to validate credentials
        const response = await fetch(`https://api.trello.com/1/members/me?key=${apiKey}&token=${apiToken}`);
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }
        
        hideLoading();
        showStep(2);
    } catch (error) {
        hideLoading();
        console.error('Error validating credentials:', error);
        alert('Error validating credentials. Please check your API key and token and try again.');
    }
}

// Extract workspace ID from URL
function extractWorkspaceId() {
    const workspaceUrl = document.getElementById('workspaceUrl').value.trim();
    
    if (!workspaceUrl) {
        alert('Please enter a workspace URL');
        return;
    }
    
    // Try to extract workspace ID from URL
    const urlPattern = /https?:\/\/trello\.com\/w\/([^\/]+)/i;
    const match = workspaceUrl.match(urlPattern);
    
    if (!match || !match[1]) {
        alert('Invalid Trello workspace URL. Please enter a URL like: https://trello.com/w/yourworkspace');
        return;
    }
    
    workspaceId = match[1];
    workspaceName = match[1].replace(/-/g, ' ');
    document.getElementById('workspaceName').textContent = workspaceName;
    showStep(3);
}

// Generate the report for the selected workspace
async function generateReport() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiToken = document.getElementById('apiToken').value.trim();
    
    if (!workspaceId) {
        alert('Workspace ID not found');
        return;
    }
    
    showLoading();
    
    try {
        // First get the workspace details to verify it exists
        const workspaceResponse = await fetch(`https://api.trello.com/1/organizations/${workspaceId}?key=${apiKey}&token=${apiToken}`);
        if (!workspaceResponse.ok) {
            throw new Error('Workspace not found or inaccessible');
        }
        
        const workspaceData = await workspaceResponse.json();
        workspaceName = workspaceData.displayName;
        document.getElementById('workspaceName').textContent = workspaceName;
        
        // Get all boards in the workspace
        const boardsResponse = await fetch(`https://api.trello.com/1/organizations/${workspaceId}/boards?key=${apiKey}&token=${apiToken}`);
        const boards = await boardsResponse.json();
        
        // Prepare array to store all board data
        boardsData = [];
        
        // Process each board to get members and their roles
        for (const board of boards) {
            // Get board basic details
            const boardDetailResponse = await fetch(`https://api.trello.com/1/boards/${board.id}?fields=name,shortLink,dateLastActivity&key=${apiKey}&token=${apiToken}`);
            const boardDetails = await boardDetailResponse.json();
            
            // Get board memberships with proper roles
            const membershipsResponse = await fetch(`https://api.trello.com/1/boards/${board.id}/memberships?key=${apiKey}&token=${apiToken}`);
            const memberships = await membershipsResponse.json();
            
            // Get member details for each membership
            for (const membership of memberships) {
                // Skip deactivated or unconfirmed members if needed
                if (membership.deactivated || membership.unconfirmed) continue;
                
                // Get member details
                const memberResponse = await fetch(`https://api.trello.com/1/members/${membership.idMember}?fields=fullName,username&key=${apiKey}&token=${apiToken}`);
                const memberDetails = await memberResponse.json();
                
                // Add to boardsData
                boardsData.push({
                    boardId: board.id,
                    boardName: boardDetails.name,
                    boardUrl: `https://trello.com/b/${boardDetails.shortLink}`,
                    boardLastUpdated: boardDetails.dateLastActivity,
                    memberId: membership.idMember,
                    memberName: memberDetails.fullName,
                    memberUsername: memberDetails.username,
                    role: membership.memberType
                });
            }
        }
        
        // Prepare CSV content
        let csvContent = "Board ID,Board Name,Board URL,Board Last Updated,Member ID,Member Name,Member Username,Role\n";
        
        boardsData.forEach(row => {
            csvContent += `"${row.boardId}","${row.boardName}","${row.boardUrl}","${row.boardLastUpdated}","${row.memberId}","${row.memberName}","${row.memberUsername}","${row.role}"\n`;
        });
        
        // Create download button
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.onclick = function() {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `trello_workspace_report_${workspaceName.replace(/\s+/g, '_')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        // Show report status
        document.getElementById('reportStatus').innerHTML = `
            <strong>Report Summary:</strong><br>
            - Workspace: ${workspaceName}<br>
            - Boards Processed: ${boards.length}<br>
            - Total Members: ${boardsData.length}
        `;
        
        hideLoading();
        showStep(4);
    } catch (error) {
        hideLoading();
        console.error('Error generating report:', error);
        alert(`Error generating report: ${error.message}. Please try again.`);
    }
}
