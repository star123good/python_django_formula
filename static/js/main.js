window.gp = window.gp || {};

// STOP CONSOLE.LOG ERRORS IN IE7
if (!window.console) {
  window.console = {log: function(){'use strict'; return;}};
}
// USAGE: LOG('INSIDE COOLFUNC',THIS,ARGUMENTS);
// HTTP://PAULIRISH.COM/2009/LOG-A-LIGHTWEIGHT-WRAPPER-FOR-CONSOLELOG/

window.log = function () {
    'use strict';
    log.history = log.history || [];   // STORE LOGS TO AN ARRAY FOR REFERENCE
    log.history.push(arguments);
    if (console) {
        console.log(Array.prototype.slice.call(arguments));
    }
};


// SCREEN SIZES WE USE:
gp.size = {
  phone:      480,
  max_phone:  767,
  tablet:     768,
  desktop:    980,
  lg_desktop: 1500
};

// https://github.com/xoxco/breakpoints
(function($) {
  "use strict";
  var lastSize = 0;
  var interval = null;
  $.fn.setBreakpoints = function(settings) {
    var options = jQuery.extend({
                  distinct: true,
                  breakpoints: [320,480,768,980,1500]
                  },settings);
      var w = $(window).width();
      var done = false;
      // var bp;
      // var sorted = options.breakpoints.sort(function(a,b) {
      //                return (b-a);
      //              });
      for (var bp in options.breakpoints.sort(function(a,b) { return (b-a); })) {
        // fire onEnter when a browser expands into a new breakpoint
        // if in distinct mode, remove all other breakpoints first.
        if (!done && w >= options.breakpoints[bp] && lastSize < options.breakpoints[bp]) {
          if (options.distinct) {
            for (var x in options.breakpoints.sort(function(a,b) { return (b-a) })) {
              if ($('body').hasClass('breakpoint-' + options.breakpoints[x])) {
                $('body').removeClass('breakpoint-' + options.breakpoints[x]);
                $(window).trigger('exitBreakpoint' + options.breakpoints[x]);
              }
            }
            done = true;
          }
          $('body').addClass('breakpoint-' + options.breakpoints[bp]);
          $(window).trigger('enterBreakpoint' + options.breakpoints[bp]);
        }
        // fire onExit when browser contracts out of a larger breakpoint
        if (w < options.breakpoints[bp] && lastSize >= options.breakpoints[bp]) {
          $('body').removeClass('breakpoint-' + options.breakpoints[bp]);
          $(window).trigger('exitBreakpoint' + options.breakpoints[bp]);

        }
        // if in distinct mode, fire onEnter when browser contracts into a smaller breakpoint
        //conditions:
        //only one breakpoint at a time
        //and we are in this one
        //and smaller than the bigger one
        //and we contracted
        //and this is not the first time
        //and we aren't already in this breakpoint
        if ( options.distinct && w >= options.breakpoints[bp] && w < options.breakpoints[bp-1] && lastSize > w && lastSize >0 && !$('body').hasClass('breakpoint-' + options.breakpoints[bp]) ) {         
            $('body').addClass('breakpoint-' + options.breakpoints[bp]);
            $(window).trigger('enterBreakpoint' + options.breakpoints[bp]);
        }
      };
      // set up for next call
      if (lastSize != w) {
        lastSize = w;
      };
  };
})(jQuery);


//CACHE PAGE ELEMENTS
gp.el = {
  menu: $(".main-nav")
};

// CREATE BURGER MENU FOR SMALL SCREENS
gp.burgerMenu = {
  create: function(){
    var burgerMenuItems = '<div class="mobile-nav-wrapper"><div id="tabs"><div class="tab-links">'+
                          '<a href="#tab-1">Live Timing</a>'+
                          '<a href="#tab-2">Commentary</a>'+
                          '<a href="#tab-3" class="resize-hidden">Weather & Speed</a>'+
                          '</div></div><div id="menu-button"></div></div>';
    $(gp.el.menu).prepend(burgerMenuItems);
    $(gp.el.menu).find('li ul').parent().addClass('has-sub');
    $(gp.el.menu).find(".has-sub").prepend('<span class="submenu-button"></span>');

    $(document).on('click', '#menu-button', function() {
      $(this).toggleClass('menu-opened');
      $(gp.el.menu).toggleClass('mobile-nav-opened');
      var mainmenu = $(this).parent().next('ul');
      if (mainmenu.hasClass('open')) { 
        mainmenu.hide().removeClass('open');
      } else {
        mainmenu.show().addClass('open');
        mainmenu.find('> ul').show();
      }
    });

    $(document).on('click', '.has-sub' , function(e) {
      $(this).find('.submenu-button').toggleClass('submenu-opened');
      if ($('ul',this).hasClass('open')) {
        $('ul',this).removeClass('open').hide();
      } else {
        $('ul',this).addClass('open').show();
      }
    });

    $(document).on('click touch','body',function(e){
      if(e.toElement !== "undefined") {
        var $el = $(e.toElement);
        if($el.closest('.has-sub').length === 0){
          // if($('.main-nav').css('position') !== "fixed") {
            if($('.submenu-button').hasClass('submenu-opened')){
              $($('.submenu-button').closest('.has-sub')).trigger('click');
            }
            // gp.sticky.setPosition();
          // }
        }
      }
    });
  }
};

// SYNC ANCHOR ACTIVE/INACTIVE STATES BETWEEN DROPDOWN AND NORMAL NAVIGATION
gp.menu = {
  syncEvents: function(){
    $(document).on('click', '.main-nav a', function(e){
      e.preventDefault();
      var href = $(this).attr('href');
      if(href === "#") return;
      if($(this).parent().hasClass('tab-links')) {
        // BURGER MENU LINK BEHAVIOUR
        var tabLinks = $(this).parent();
        $('.main-nav li').removeClass('active');
        $('.tab-links a').removeClass('active');
        $(this).addClass('active');
        $('.main-nav li a[href="'+ href +'"]').parent().addClass('active');
      } else {
        // NORMAL MENU LINK BEHAVIOUR
        $('.main-nav li').removeClass('active');
        $('.tab-links a').removeClass('active');
        $(this).parents('li').addClass('active');
        $('.tab-links a[href="'+ href +'"]').addClass('active');
      }
      if($('#menu-button').hasClass('menu-opened')){
        $('#menu-button').trigger('click');  
      }
      if($(this).closest('.has-sub').length === 0) {
        if($('.submenu-button').hasClass('submenu-opened')){
          $($('.submenu-button').closest('.has-sub')).trigger('click');
        }
      }
      gp.screen.activate(href);
    });
  }
};

// SCREENS TO BE ACTIVE/INACTIVE BASED ON ANCHOR STATES
gp.screen = {
  activate: function(href) {
    var screenID = href;
    $('.screen').removeClass('is-visible');
    $(screenID).addClass('is-visible');
  },
  setHeight: function(){
    var windowHeight = window.innerHeight;
    var headerHeight = 230;
    $('.screen').height(windowHeight-headerHeight);
    $('.screen.live-timming').height(windowHeight-headerHeight-50);
  },
  clearHeight: function(){
    $('.screen').removeAttr('style');
  }
};

// SET DEFAULT SCREEN AND VIEW FOR ONLOAD
gp.setDefault = {
  phone: function(){
    $('.tab-links a[href="#tab-1"]').trigger('click');
    gp.sticky.create();
  },
  tablet: function(){
    $('.tab-links a[href="#tab-1"]').trigger('click');
    gp.sticky.create();
  },
  desktop: function(){
    gp.screen.setHeight();
    gp.sticky.destroy();
    $('.tab-links a[href="#tab-2"]').trigger('click');
  },
  orientation: function(direction){
    var innerWidth = window.innerWidth;
    if(innerWidth >= gp.size.tablet) {
      // if ( direction === "landscape" ) {

      // }
      if ( direction === "portrait" ) {
        if ($('.tab-links a[href="#tab-2"]').hasClass('active')){
          $('.tab-links a[href="#tab-1"]').trigger('click');
        }
      }  
    }
  }
};

// RESIZE FIXES
gp.resizeFix = function(){
  $(window).bind('enterBreakpoint480',function() {
    // log('phone');
    gp.sticky.create();
  });
  $(window).bind('enterBreakpoint768',function() {
    // log('tablet');
    gp.screen.clearHeight();
    gp.sticky.create();
    $('.screen').each(function(){
      var href = '#'+$(this).attr('id');
      if ($(this).hasClass('is-visible')){
        $('.parent-menu a[href="'+ href +'"]').trigger('click');
      }
    });
  });
  $(window).bind('enterBreakpoint980',function() {
    // log('desktop');
    gp.screen.setHeight();
    gp.sticky.destroy();
    if($('.screen.live-timming').hasClass('is-visible')){
      $('.tab-links a[href="#tab-2"]').trigger('click');
    }
  });
};


// SCROLL STICKY ELEMENTS
var scroller;
gp.sticky = {
  create: function(){
    scroller = true;
  },
  setPosition: function(){
    var top = $(window).scrollTop();
    var header = $('.page-header').outerHeight(true);
    var nav = $('.mobile-nav-wrapper').outerHeight(true);
    var title = $('h1').outerHeight(true);
    if (top > (header-80)) { 
      // to avoid jerks for mobile landsacpe mode.
      // $('.main-nav').css({'top': top+'px','z-index': '3','position':'absolute','width':'100%'});
      // $('h1').css({'top': top+nav+'px','z-index': '2','position':'absolute','width':'100%'});
      $('.main-nav').css({'top': nav+'px','z-index': '3','position':'fixed','width':'100%'});
      $('h1').css({'top': '0','z-index': '2','position':'fixed','width':'100%'});
    } else {
      $('.main-nav').removeAttr('style');
      $('h1').removeAttr('style');
    }
  },
  destroy: function(){
    scroller = false;
    $('.main-nav').removeAttr('style');
    $('h1').removeAttr('style');
  }
};


$(document).ready(function() {
  gp.burgerMenu.create();
  gp.menu.syncEvents();

  var innerWidth = window.innerWidth;
  if(innerWidth > 0 && innerWidth <= gp.size.max_phone) {
    //phone
    gp.setDefault.phone();
  } else if(innerWidth >= gp.size.tablet && innerWidth < gp.size.desktop) {
    //tablet
    gp.setDefault.tablet();
  } else if(innerWidth >= gp.size.desktop) {
    //desktop
    gp.setDefault.desktop();
  } else {
    // log('else');
  }
  if ($('html').hasClass('lt-ie10')) return;
  gp.resizeFix();
  var resizeId;
  $(window).resize(function() {
      clearTimeout(resizeId);
      resizeId = setTimeout(function(){$(window).setBreakpoints()}, 500);
  });

  window.addEventListener('scroll',function() {
      if(!scroller) return;
      gp.sticky.setPosition();
  },false);
});

// ORIENTATION FIX HTTP://DAVIDBCALHOUN.COM/2010/DEALING-WITH-DEVICE-ORIENTATION/
(function(){
  var supportsOrientation = (typeof window.orientation == 'number' && typeof window.onorientationchange == 'object');
  var HTMLNode = document.body.parentNode;
  var updateOrientation = function() {
    // rewrite the function depending on what's supported
    if(supportsOrientation) {
      updateOrientation = function() {
        var orientation = window.orientation;
        switch(orientation) {
          case 90: case -90:
            orientation = 'landscape';
          break;
          default:
            orientation = 'portrait';
        };
        $('html').removeClass('landscape');
        $('html').removeClass('portrait');
        $('html').addClass(orientation);
        // gp.setDefault.orientation(orientation);
      }
    } else {
      updateOrientation = function() {
        // landscape when width is biggest, otherwise portrait
        var orientation = (window.innerWidth > window.innerHeight) ? 'landscape': 'portrait';
        $('html').removeClass('landscape');
        $('html').removeClass('portrait');
        $('html').addClass(orientation);
        // gp.setDefault.orientation(orientation);
      }
    }
    updateOrientation();
  }
  var init = function() {
    // initialize the orientation
    updateOrientation();
    if(supportsOrientation) {
      window.addEventListener('orientationchange', updateOrientation, false);
    } else {
      // fallback: update every 2 seconds
      setInterval(function(){updateOrientation()}, 2000);
    }
  }
  if (document.addEventListener) {
    window.addEventListener('DOMContentLoaded', init, false);
  }
})();