$(document).ready(function(){
  $('.external').attr('target', '_parent');
});

$(document).ready(function(){
  $('h1').after(' \
  <div class="banner"> \
    Dear User, the services developed by the Human Brain Project are evolving. \
    <br> \
    <br> \
    <strong>As of **1 September 2021**, HBP’s services will be located under ebrains.eu.</strong> \
    <br> \
    <br> \
    The process of moving the functionality of the Brain Simulation Platform to EBRAINS is underway. \
    <br> \
    <strong>**See <a target="_blank" \
            href="https://drive.ebrains.eu/d/e736ecb9115d4b4584c4/files/?p=/UseCaseMapping.xlsx">here</a> \
        for the progress.**</strong> \
    <br> \
    <br> \
    If you have been using the default services, \
    you will find most of the functionality simply under the new URLs. \
    If you have been using custom data, you will need to migrate that data yourself. \
    <br> \
    <strong>**See <a target="_blank" \
            href="https://wiki.ebrains.eu/bin/view/Collabs/the-collaboratory/how-to/Migrate%20your%20data/">here</a> \
        for the instructions. We recommend that you keep a local copy.**</strong> \
    <br> \
    <br> \
    If you have modified the default services (notebooks), migration will require code modifications; \
    for questions about this, please be in touch with <i>support@ebrains.eu</i>. \
  </div> ');
});
