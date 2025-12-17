   const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerBtn');
        const overlay = document.getElementById('overlay');

        // Toggle Sidebar Function
        function toggleSidebar() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }

        hamburger.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);