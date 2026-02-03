// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            mobileMenuBtn.setAttribute('aria-expanded', navLinks.classList.contains('active'));
        });
        
        // Close mobile menu when clicking on a link
        const navItems = navLinks.querySelectorAll('a');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                navLinks.classList.remove('active');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }
    
    // Video controls functionality
    const videoOverlay = document.getElementById('videoOverlay');
    const youtubePlayer = document.getElementById('youtubePlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const muteBtn = document.getElementById('muteBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (videoOverlay && youtubePlayer) {
        // Play video when overlay is clicked
        videoOverlay.addEventListener('click', function() {
            this.classList.add('hidden');
            if (youtubePlayer.contentWindow) {
                youtubePlayer.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            }
        });
        
        // Play/Pause button
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', function() {
                videoOverlay.classList.add('hidden');
                if (youtubePlayer.contentWindow) {
                    youtubePlayer.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                }
            });
        }
        
        // Mute/Unmute button
        if (muteBtn) {
            muteBtn.addEventListener('click', function() {
                const icon = this.querySelector('i');
                if (icon.classList.contains('fa-volume-up')) {
                    icon.classList.remove('fa-volume-up');
                    icon.classList.add('fa-volume-mute');
                    if (youtubePlayer.contentWindow) {
                        youtubePlayer.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
                    }
                } else {
                    icon.classList.remove('fa-volume-mute');
                    icon.classList.add('fa-volume-up');
                    if (youtubePlayer.contentWindow) {
                        youtubePlayer.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
                    }
                }
            });
        }
        
        // Fullscreen button
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', function() {
                videoOverlay.classList.add('hidden');
                if (youtubePlayer.requestFullscreen) {
                    youtubePlayer.requestFullscreen();
                } else if (youtubePlayer.mozRequestFullScreen) { /* Firefox */
                    youtubePlayer.mozRequestFullScreen();
                } else if (youtubePlayer.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                    youtubePlayer.webkitRequestFullscreen();
                } else if (youtubePlayer.msRequestFullscreen) { /* IE/Edge */
                    youtubePlayer.msRequestFullscreen();
                }
            });
        }
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
});