document.addEventListener("DOMContentLoaded", function(event) {
    
    const showNavbar = (toggleId, navId, bodyId, headerId) => {
        const toggle = document.getElementById(toggleId);
        const nav = document.getElementById(navId);
        const bodypd = document.getElementById(bodyId);
        
        // do not use header element at ll
        // const headerpd = document.getElementById(headerId);
        
        // Validate that all variables exist
        if(toggle && nav && bodypd /*&& headerpd*/) {
            toggle.addEventListener('click', () => {
                // show navbar
                nav.classList.toggle('show')
                // change icon
                toggle.classList.toggle('bx-x')
                // add padding to body
                bodypd.classList.toggle('body-pd')
                // add padding to header
                //headerpd.classList.toggle('body-pd')
            });
        }
    }
    
    showNavbar('menu-toggle','nav-bar','body-pd','header')
    
    /*===== LINK ACTIVE =====*/
    const linkColor = document.querySelectorAll('.nav_link')
    function colorLink() {
        if(linkColor) {
            linkColor.forEach(l => l.classList.remove('active'))
            this.classList.add('active')
        }
    }
    linkColor.forEach(l => l.addEventListener('click', colorLink))
});

var myLink = document.querySelectorAll('a[href="#"]');
myLink.forEach(function(link){
    link.addEventListener('click', function(e) {
        e.preventDefault();
    });
});