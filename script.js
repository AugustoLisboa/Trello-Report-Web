// Global variables to store data between steps
let workspaceId = '';
let workspaceName = '';
let boardsData = [];
let groupedBoardsData = [];

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
        
        // Prepare arrays to store board data
        boardsData = [];
        groupedBoardsData = [];
        const membersCache = {};
        
        // Function to fetch member details with caching
        async function fetchMemberDetails(memberId) {
            if (!membersCache[memberId]) {
                const response = await fetch(`https://api.trello.com/1/members/${memberId}?fields=fullName,username&key=${apiKey}&token=${apiToken}`);
                membersCache[memberId] = await response.json();
            }
            return membersCache[memberId];
        }

        // Process each board to get members and their roles
        for (const board of boards) {
            // Get board basic details including creator
            const boardDetailResponse = await fetch(`https://api.trello.com/1/boards/${board.id}?fields=name,shortLink,dateLastActivity,idMemberCreator&key=${apiKey}&token=${apiToken}`);
            const boardDetails = await boardDetailResponse.json();
            
            // Get board creator name
            let boardCreator = "Unknown";
            if (boardDetails.idMemberCreator) {
                const creatorDetails = await fetchMemberDetails(boardDetails.idMemberCreator);
                boardCreator = creatorDetails.fullName || creatorDetails.username;
            }

            // Get board memberships with proper roles
            const membershipsResponse = await fetch(`https://api.trello.com/1/boards/${board.id}/memberships?key=${apiKey}&token=${apiToken}`);
            const memberships = await membershipsResponse.json();
            
            // Filter active memberships and count
            const activeMemberships = memberships.filter(m => !m.deactivated && !m.unconfirmed);
            const boardMemberCount = activeMemberships.length;
            
            // Prepare members list for grouped export
            const membersList = [];
            
            // Get member details for each active membership
            for (const membership of activeMemberships) {
                // Get member details
                const memberDetails = await fetchMemberDetails(membership.idMember);
                
                // Add to boardsData (for detailed export)
                boardsData.push({
                    boardId: board.id,
                    boardName: boardDetails.name,
                    boardUrl: `https://trello.com/b/${boardDetails.shortLink}`,
                    boardLastUpdated: boardDetails.dateLastActivity,
                    boardCreator: boardCreator,
                    boardMemberCount: boardMemberCount,
                    memberId: membership.idMember,
                    memberName: memberDetails.fullName,
                    memberUsername: memberDetails.username,
                    role: membership.memberType
                });
                
                // Add to members list (for grouped export)
                membersList.push(`${memberDetails.fullName} (${membership.memberType})`);
            }
            
            // Add to groupedBoardsData (for clean export)
            groupedBoardsData.push({
                boardId: board.id,
                boardName: boardDetails.name,
                boardUrl: `https://trello.com/b/${boardDetails.shortLink}`,
                boardLastUpdated: boardDetails.dateLastActivity,
                boardCreator: boardCreator,
                boardMemberCount: boardMemberCount,
                members: membersList.join(', ')
            });
        }
        
        // Prepare CSV content for detailed export
        let detailedCSV = "Board ID,Board Name,Board URL,Board Last Updated,Board Creator,Board Member Count,Member ID,Member Name,Member Username,Role\n";
        boardsData.forEach(row => {
            detailedCSV += `"${row.boardId}","${row.boardName}","${row.boardUrl}","${row.boardLastUpdated}","${row.boardCreator}","${row.boardMemberCount}","${row.memberId}","${row.memberName}","${row.memberUsername}","${row.role}"\n`;
        });
        
        // Prepare CSV content for clean export
        let cleanCSV = "Board ID,Board Name,Board URL,Board Last Updated,Board Creator,Board Member Count,Members\n";
        groupedBoardsData.forEach(row => {
            cleanCSV += `"${row.boardId}","${row.boardName}","${row.boardUrl}","${row.boardLastUpdated}","${row.boardCreator}","${row.boardMemberCount}","${row.members}"\n`;
        });
        
        // Show report status with download buttons
        document.getElementById('reportStatus').innerHTML = `
            <strong>Report Summary:</strong><br>
            - Workspace: ${workspaceName}<br>
            - Boards Processed: ${boards.length}<br>
            - Total Board Memberships: ${boardsData.length}<br>
            <div class="export-options">
                <p>Export Options:</p>
                <button id="downloadDetailedBtn">Download Detailed CSV</button>
                <button id="downloadCleanBtn" style="background-color:#28a745;color:white">Download Clean CSV</button>
            </div>
        `;

        // Add event listeners to the newly created buttons
        document.getElementById('downloadDetailedBtn').addEventListener('click', function() {
            downloadCSV(detailedCSV, 'detailed');
        });
        
        document.getElementById('downloadCleanBtn').addEventListener('click', function() {
            downloadCSV(cleanCSV, 'clean');
        });
        
        hideLoading();
        showStep(4);
    } catch (error) {
        hideLoading();
        console.error('Error generating report:', error);
        alert(`Error generating report: ${error.message}. Please try again.`);
    }
}

// Helper function to download CSV
function downloadCSV(csvData, type) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const filename = `trello_${workspaceName.replace(/\s+/g, '_')}_${groupedBoardsData.length}_boards_${type}.csv`;
    link.setAttribute('download', filename);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
