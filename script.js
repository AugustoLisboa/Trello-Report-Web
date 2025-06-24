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
            // Get detailed board information including all members with their roles
            const boardDetailResponse = await fetch(`https://api.trello.com/1/boards/${board.id}?fields=id,name,shortLink,idMemberCreator,dateLastActivity&members=all&member_fields=fullName,username,memberType&key=${apiKey}&token=${apiToken}`);
            const boardDetails = await boardDetailResponse.json();
            
            // Get creator details
            let creatorName = "Unknown";
            let creatorUsername = "unknown";
            if (boardDetails.idMemberCreator) {
                const creatorResponse = await fetch(`https://api.trello.com/1/members/${boardDetails.idMemberCreator}?fields=fullName,username&key=${apiKey}&token=${apiToken}`);
                const creatorDetails = await creatorResponse.json();
                creatorName = creatorDetails.fullName;
                creatorUsername = creatorDetails.username;
            }
            
            // Process all members of the board
            const membersWithRoles = boardDetails.members.map(member => ({
                boardId: board.id,
                boardName: board.name,
                boardUrl: `https://trello.com/b/${board.shortLink}`,
                boardCreatorId: boardDetails.idMemberCreator,
                boardCreatorName: creatorName,
                boardCreatorUsername: creatorUsername,
                boardLastUpdated: boardDetails.dateLastActivity,
                memberId: member.id,
                memberName: member.fullName,
                memberUsername: member.username,
                role: member.memberType || 'normal' // Default to 'normal' if undefined
            }));
            
            boardsData = boardsData.concat(membersWithRoles);
        }
        
        // Prepare CSV content
        let csvContent = "Board ID,Board Name,Board URL,Board Creator ID,Board Creator Name,Board Creator Username,Board Last Updated,Member ID,Member Name,Member Username,Role\n";
        
        boardsData.forEach(row => {
            csvContent += `"${row.boardId}","${row.boardName}","${row.boardUrl}","${row.boardCreatorId}","${row.boardCreatorName}","${row.boardCreatorUsername}","${row.boardLastUpdated}","${row.memberId}","${row.memberName}","${row.memberUsername}","${row.role}"\n`;
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
