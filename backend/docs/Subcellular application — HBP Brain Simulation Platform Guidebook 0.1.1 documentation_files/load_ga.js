var head = document.getElementsByTagName('head')[0];
var ga_script_g = document.createElement('SCRIPT');
var ga_script = document.createElement('SCRIPT');
ga_script_g.async = true;
ga_script.type = 'text/javascript';

var url = window.location.href;

if (url.includes("https://humanbrainproject.github.io/hbp-sp6-guidebook/") ||
    url.includes("https://collab.humanbrainproject.eu")){
	console.log("Loading ga for prod")
    ga_script_g.src = 'https://www.googletagmanager.com/gtag/js?id=UA-91794319-7';
    ga_script.src = 'https://humanbrainproject.github.io/hbp-sp6-guidebook/_static/gb_prod_analytics.js';
} else if (url.includes("https://lbologna.github.io/hbp-sp6-guidebook/")){
	console.log("Loading ga for dev")
    ga_script_g.src = 'https://www.googletagmanager.com/gtag/js?id=UA-91794319-6';
    ga_script.src = 'https://lbologna.github.io/hbp-sp6-guidebook/_static/gb_dev_analytics.js';
} else {
    console.log("Loading locally or from an unknown domain");
} 

head.prepend(ga_script);
head.prepend(ga_script_g);
