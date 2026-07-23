/* analytics-tracking.js — GA4 + Meta Pixel loader (only fires if IDs are set in config.js). Unmodified. */
/* تحميل GA4 و Meta Pixel تلقائيًا بس لو المعرف متحطوط في config.js - من غير كده مفيش أي طلبات إضافية */
(function(){
  if(typeof GA_MEASUREMENT_ID !== 'undefined' && GA_MEASUREMENT_ID){
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
  }
  if(typeof META_PIXEL_ID !== 'undefined' && META_PIXEL_ID){
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', META_PIXEL_ID); fbq('track', 'PageView');
  }
})();
