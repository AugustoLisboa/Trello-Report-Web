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
        console.error('Error fetching workspaces:', error);
        alert('Error fetching workspaces. Please check your API key and token and try again.');
    }
}

// Generate the report for the selected workspace
async function generateReport() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiToken = document.getElementById('apiToken').value.trim();
    const workspaceId = document.getElementById('workspaceSelect').value;
    
    if (!workspaceId) {
        alert('Please select a workspace');
        return;
    }
    
    showLoading();
    
    try {
        // Get all boards in the workspace
        const boardsResponse = await fetch(`https://api.trello.com/1/organizations/${workspaceId}/boards?key=${apiKey}&token=${apiToken}`);
        const boards = await boardsResponse.json();
        
        // Prepare array to store all board data
        boardsData = [];
        
        // Process each board to get members and their roles
        for (const board of boards) {
            const membersResponse = await fetch(`https://api.trello.com/1/boards/${board.id}/members?key=${apiKey}&token=${apiToken}`);
            const members = await membersResponse.json();
            
            // Format members data
            const membersWithRoles = members.map(member => ({
                boardId: board.id,
                boardName: board.name,
                memberId: member.id,
                memberName: member.fullName,
                memberUsername: member.username,
                role: member.memberType
            }));
            
            boardsData = boardsData.concat(membersWithRoles);
        }
        
        // Prepare CSV content
        let csvContent = "Board ID,Board Name,Member ID,Member Name,Member Username,Role\n";
        
        boardsData.forEach(row => {
            csvContent += `"${row.boardId}","${row.boardName}","${row.memberId}","${row.memberName}","${row.memberUsername}","${row.role}"\n`;
        });
        
        // Create download button
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.onclick = function() {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `trello_workspace_report_${workspaceId}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        // Show report status
        document.getElementById('reportStatus').innerHTML = `
            <strong>Report Summary:</strong><br>
            - Workspace: ${document.getElementById('workspaceSelect').selectedOptions[0].text}<br>
            - Boards Processed: ${boards.length}<br>
            - Total Members: ${boardsData.length}
        `;
        
        hideLoading();
        showStep(3);
    } catch (error) {
        hideLoading();
        console.error('Error generating report:', error);
        alert('Error generating report. Please try again.');
    }
}
