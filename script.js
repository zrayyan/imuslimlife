// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Screenshot Slider
const track = document.querySelector('.screenshot-track');
const screenshots = document.querySelectorAll('.screenshot');
const dots = document.querySelectorAll('.slider-dots .dot');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
let currentIndex = 0;
const screenWidth = window.innerWidth;

// Set initial width and position for screenshots
function setupSlider() {
    const sliderWidth = document.querySelector('.screenshot-slider').offsetWidth;
    const screenshotWidth = Math.min(280, sliderWidth * 0.8);
    const totalWidth = screenshotWidth * screenshots.length;

    track.style.width = `${totalWidth}px`;
    screenshots.forEach(screenshot => {
        screenshot.style.width = `${screenshotWidth}px`;
    });
}

function moveToSlide(index) {
    if (index < 0) {
        index = 0;
    } else if (index > screenshots.length - 1) {
        index = screenshots.length - 1;
    }

    currentIndex = index;
    const offset = -screenshots[currentIndex].offsetLeft + (window.innerWidth - screenshots[currentIndex].offsetWidth) / 2;
    track.style.transform = `translateX(${offset}px)`;

    // Update dots
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
    });
}

// Initialize slider
setupSlider();
moveToSlide(0);

// Event listeners for slider
prevBtn.addEventListener('click', () => moveToSlide(currentIndex - 1));
nextBtn.addEventListener('click', () => moveToSlide(currentIndex + 1));

dots.forEach((dot, index) => {
    dot.addEventListener('click', () => moveToSlide(index));
});

// Testimonial Slider
const testimonials = document.querySelectorAll('.testimonial');
const testimonialDots = document.querySelectorAll('.testimonial-dots .dot');
let currentTestimonial = 0;

function showTestimonial(index) {
    testimonials.forEach(testimonial => testimonial.classList.remove('active'));
    testimonialDots.forEach(dot => dot.classList.remove('active'));

    testimonials[index].classList.add('active');
    testimonialDots[index].classList.add('active');
    currentTestimonial = index;
}

testimonialDots.forEach((dot, index) => {
    dot.addEventListener('click', () => showTestimonial(index));
});

// Auto rotate testimonials
setInterval(() => {
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    showTestimonial(currentTestimonial);
}, 5000);

// FAQ accordion
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');

        // Close all items
        faqItems.forEach(faqItem => {
            faqItem.classList.remove('active');
        });

        // Open clicked item if it wasn't already open
        if (!isOpen) {
            item.classList.add('active');
        }
    });
});

// Responsive adjustments
window.addEventListener('resize', () => {
    setupSlider();
    moveToSlide(currentIndex);
});

// Add smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });

            // Close mobile navigation if open
            navLinks.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
});

// Add scroll animation for elements
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.feature-card, .screenshot, .faq-item, .section-title');

    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;

        if (elementPosition < screenPosition) {
            element.classList.add('animate');
        }
    });
};

window.addEventListener('scroll', animateOnScroll);
animateOnScroll(); // Run once on load

// Add current year to footer
document.querySelector('.footer-bottom p').textContent =
    `© ${new Date().getFullYear()} Salat-e-Mustaqeem. All rights reserved.`;