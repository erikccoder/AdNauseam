
self.port && self.port.on('layout-ads', layoutAds); // refresh all
self.port && self.port.on('update-ads', updateAds); // update some
self.port && self.port.on('refresh-panel', refreshPanel); // set-state

function layoutAds(json) {

	adArray = json.data;
	
	var pageUrl = json.page// currentAd = json.currentAd;

    if (!adArray) return;
    
    //log('Menu::layoutAds: '+adArray.length + " ads");
    	
	var pageUrl = typeof TEST_MODE != 'undefined'
		&& TEST_MODE ? TEST_PAGE : json.page;
	   
    var adsOnPage = adArray.filter(function(a) {
        
        return (a.pageUrl === pageUrl);
    });
    
    adsOnPage.sort(byField('-foundTs')); // sort by found-time

    var theHtml = createHtml(adsOnPage, adArray);
	$('#ad-list-items').html(theHtml);

    //currentAd && tagCurrentAd(currentAd);

	setCounts(adsOnPage.length, visitedCount(adsOnPage), adArray.length);
}

function updateAds(obj) {

    var sel, td, onpage,
        currentAd = obj.currentAd,
        update = obj.update, 
        pageUrl = obj.page;

    if (!adArray) {
        
        console.warn('Menu::updateAds: ', "no ad array!!");
        return;
    }
    
    if (!replaceUpdatedAd(update))  {
        
        console.warn('Menu::updateAds: ', "no update found!!");
        return;
    }
    
    //console.log('Menu::updateAds: ', update);

    // update the title (DOM)
    sel = '#ad' + update.id + ' .title';
    $(sel).text(update.title);

    if (update.contentType !== 'text') {
        
        // update the url (DOM)
        sel = '#ad' + update.id + ' cite';
        td = targetDomain(update);
        if (td) $(sel).text(td);
    }

    // update the class (DOM)
    sel = '#ad' + update.id;
    $(sel).addClass(update.visitedTs > 0 ? 'visited' : 'failed')
        .removeClass('just-visited').addClass('just-visited');

    //currentAd && tagCurrentAd(currentAd);

    onpage = adArray.filter(function(ad) { return ad.pageUrl === pageUrl; }) 
    visited = onpage.filter(function(ad) { return ad.visitedTs > 0 })
    
    // BUG: see  #184
    $('#visited-count').text('clicked '+visitedCount(onpage));

    animateIcon(500);
}

function replaceUpdatedAd(update) {

    // update the object itself
    for (var i=0, j = adArray.length; i<j; i++) {
        if (adArray[i].id == update.id)
            return (adArray[i] = update);
    }
    return null;
}
   
function refreshPanel(opts) {

    //console.log('refreshPanel: opts: ',opts);

    var img = 'img/adn_active.png', label = 'Pause AdNauseam';

    $('#pause-button').removeClass('disabled');

    if (!opts.enabled) {

        img = 'img/adn_disabled.png';
        label = 'Start AdNauseam';
        $('#pause-button').addClass('disabled');
    }
    
    $('#cmn-toggle-1').prop('checked', opts.disableLogs); 
    $('#cmn-toggle-2').prop('checked', opts.disableOutgoingReferer);
    $('#settings-header').html('AdNauseam&nbsp;v'+opts.version+' Settings');

    $('#toggle-button').css('background-image', 'url('+img+')');
    $('#pause-button').text(label);
}

function animateIcon(ms) {
    
    var down = 'img/adn_visited.png', up = 'img/adn_active.png';
    $('#toggle-button').css('background-image', 'url('+down+')');
    
    setTimeout(function() {
        
        $('#toggle-button').css('background-image', 'url('+up+')');
        
    }, ms);
}

function setCounts(found, visited, total) {

	$('#found-count').text(found+' ads detected');
	$('#visited-count').text('clicked '+visited);
	$('#vault-count').text(total);
}

function visitedCount(arr) {

	var visitedCount = 0;
	for (var i=0, j = arr.length; i<j; i++) {
	    console.log("checking: "+arr[i].visitedTs);
		if (arr[i].visitedTs > 0)
			visitedCount++;
	}
	return visitedCount;
}

function getRecentAds(ads, num) {
    
    var recent = [];

    if (ads) {
        
        ads.sort(byField('-foundTs')); // sort by found-time
    
    
        // put pending ads first
        for (var i=0; recent.length < num && i < ads.length; i++) {
            
            (ads[i].visitedTs == 0)  && recent.push(ads[i]);
        }
        
        // now fill with the rest
        for (var i=0; recent.length < num && i < ads.length; i++) {
            
            if (recent.indexOf(ads[i]) < 0)
                recent.push(ads[i]);
        }      
        
        // TODO: make sure currently-being-attempted ad is first
    }
       
    return recent;
}

function createHtml(ads, all) { // { fields: ads, onpage, unique };
 
	showAlert(false);
	
	$('#ad-list-items').removeClass();
	
	if (!ads || !ads.length) { // no-ads on this page, show 5 recent instead
	    
        ads = getRecentAds(all, 5);
        
        var msg = 'no ads on this page';
        if (ads && ads.length) msg += ' (showing recent)';
        
        showAlert(msg);
        
        $('#ad-list-items').addClass('recent-ads');
        
        console.log('Handle case: no-ads on page *** '+ads.length+' recent ads');
    }

    var html = ''; // TODO: redo this ugliness  
	for (var i=0, j = ads.length; i<j; i++) {

		if (ads[i].contentType === 'img') {

			html += '<li id="ad' + ads[i].id +'" class="ad-item' + visitedClass(ads[i]);
			html += '"><a target="new" href="' + ads[i].targetUrl;
			html += '"><span class="thumb"><img src="' + (ads[i].contentData.src || ads[i].contentData);
			html += '" class="ad-item-img" onerror="';
			html += 'this.onerror=null; this.width=50; this.height=45;';
            html += "this.src='img/placeholder.svg'\"></span><span class=\"title\">";
			html +=  ads[i].title ? ads[i].title  : "#" + ads[i].id;
			html += '</span><cite>' + targetDomain(ads[i]) + '</cite></a></li>\n\n';
		}
		else if (ads[i].contentType === 'text') {

			html += '<li id="ad' + ads[i].id +'" class="ad-item-text' + visitedClass(ads[i]);
			html += '""><span class="thumb">Text Ad</span><h3><a target="new" class="title" href="'
			html += ads[i].targetUrl + '">' + ads[i].title + '</a></h3><cite>' + ads[i].contentData.site;
			if (TEST_APPEND_IDS) html += ' (#'+ads[i].id+')';
			html += '</cite><div class="ads-creative">' + ads[i].contentData.text +'</div></li>\n\n';
		}
	}
	
    //console.log("\nHTML\n"+html+"\n\n");

	return html;
}

function visitedClass(ad) {

	return ad.visitedTs > 0 ? ' visited' :
		(ad.visitedTs < 0 ? ' failed' : '');
}

function param(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function attachMenuTests() {
    
    console.log('attachMenuTests()');
    
    function assert(test, exp, msg) {
        msg = msg || 'expecting "' + exp + '", but got';
        console.log((test == exp) ? 'OK' : 'FAIL: ' + msg, test);
    }

	$('#log-button').off('click').click(function() {
		window.location.href = "log.html"
	});

	$('#vault-button').off('click').click(function() {
		window.location.href = "vault.html"
	});

	$('#about-button').off('click').click(function() {
		window.location.href = "https://github.com/dhowe/AdNauseam/wiki/Help"
	});

	$.getJSON(TEST_ADS, function(json) {

		console.warn("Menu.js :: Loading test-ads: "+TEST_ADS);
	    layoutAds({ data : toAdArray(json), page : TEST_PAGE });

	}).fail(function(e) { console.warn( "error:", e); });
}

(function() {

	//console.log('Ready: INIT_MENU_HANDLERS');

	$('#log-button').click(function(e) {
		//console.log('#log-button.click');

		self.port && self.port.emit("show-log");
	});

	$('#vault-button').click(function() {
		//console.log('#vault-button.click');

		self.port && self.port.emit("show-vault");
	});

	$('#clear-ads').click(function(e) {

		e.preventDefault(); // no click

		// remove all visible ads from menu
		$('.ad-item').remove();
		$('.ad-item-text').remove();
		
		setCounts(0, 0, 0);

		// trigger closing of settings
		$("#settings-close").trigger("click");

		// call addon to clear simple-storage
		self.port && self.port.emit("clear-ads");
		
		createHtml();
	});

	$('#pause-button').click(function() {
		//console.log('#pause-button.click');
		self.port && self.port.emit('disable');
	});

	$('#settings-close').click(function() {

		//console.log('#settings-close.click');

		$('.page').toggleClass('hide');
		$('.settings').toggleClass('hide');

		self.port && self.port.emit('hide-settings');
	});

	$('#settings-open').click(function() {

		//console.log('#settings-open.click');

		$('.page').toggleClass('hide');
		$('.settings').toggleClass('hide');

		self.port && self.port.emit('show-settings');
	});

	$('#about-button').click(function() {

		//console.log('#about-button.click');
		self.port && self.port.emit('show-about');
	});

	$('#cmn-toggle-1').click(function() { // logging

		var val = $(this).prop('checked');

		//console.log('#disable-logs.click: '+val);
		self.port && self.port.emit('disable-logs', { 'value' : val });
	});
	
    $('#cmn-toggle-2').click(function() { // referer

        var val = $(this).prop('checked');

        //console.log('#disable-logs.click: '+val);
        self.port && self.port.emit('disable-referer', { 'value' : val });
    });

})();
