document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.show-description');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const projectFile = button.getAttribute('data-project');
            const descriptionDiv = button.nextElementSibling;

            if (descriptionDiv.style.display === 'block') {
                descriptionDiv.style.display = 'none';
            } else {
                fetch(projectFile)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to load description');
                        }
                        return response.text();
                    })
                    .then(data => {
                        descriptionDiv.textContent = data;
                        descriptionDiv.style.display = 'block'; 
                    })
                    .catch(error => {
                        descriptionDiv.textContent = 'Error loading description: ' + error.message;
                        descriptionDiv.style.display = 'block'; 
                    });
            }
        });
    });
});
