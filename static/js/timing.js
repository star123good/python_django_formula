﻿/*!
* isVis - v0.5.5 Aug 2011 - Page Visibility API Polyfill
* Copyright (c) 2011 Addy Osmani
* Dual licensed under the MIT and GPL licenses.
*/
(function () {
    window.visibly = {
        b: null,
        q: document,
        p: undefined,
        prefixes: ['webkit', 'ms', 'moz'],
        props: ['VisibilityState', 'visibilitychange', 'Hidden'],
        m: ['focus', 'blur'],
        visibleCallbacks: [],
        hiddenCallbacks: [],
        _callbacks: [],

        onVisible: function (_callback) {
            this.visibleCallbacks.push(_callback);
        },
        onHidden: function (_callback) {
            this.hiddenCallbacks.push(_callback);
        },
        isSupported: function () {
            var i = this.prefixes.length;
            while (i--) if (this._supports(i)) return this.b = this.prefixes[i];
        },
        _supports: function (index) {
            return ((this.prefixes[index] + this.props[2]) in this.q);
        },
        runCallbacks: function (index) {
            if (index) {
                this._callbacks = (index == 1) ? this.visibleCallbacks : this.hiddenCallbacks;
                for (var i = 0; i < this._callbacks.length; i++) {
                    this._callbacks[i]();
                }
            }
        },
        _visible: function () {
            window.visibly.runCallbacks(1);
        },
        _hidden: function () {
            window.visibly.runCallbacks(2);
        },
        _nativeSwitch: function () {
            ((this.q[this.b + this.props[2]]) === true) ? this._hidden() : this._visible();
        },
        listen: function () {
            try { /*if no native page visibility support found..*/
                if (!(this.isSupported())) {
                    if (document.addEventListener) { /*for browsers without focusin/out support eg. firefox, opera use focus/blur*/
                        /*window used instead of doc as Opera complains otherwise*/
                        window.addEventListener(this.m[0], this._visible, 1);
                        window.addEventListener(this.m[1], this._hidden, 1);
                    } else { /*IE <10s most reliable focus events are onfocusin/onfocusout*/
                        this.q.attachEvent('onfocusin', this._visible);
                        this.q.attachEvent('onfocusout', this._hidden);
                    }
                } else { /*switch support based on prefix*/
                    this.q.addEventListener(this.b + this.props[1], function () {
                        window.visibly._nativeSwitch.apply(window.visibly, arguments);
                    }, 1);
                }
            } catch (e) { }
        },
        init: function () {
            this.listen();
        }
    }
    this.visibly.init();
})();


if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this === null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;
        var i = 0;
        for (i; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}

$(function () {
    var lt = ($.connection) ? $.connection.Streaming : null;
    var ltc = ($.connection) ? $.connection.Commentary : null;
    var reconnectCounter = 0;
    var tryingToReconnect = false;
    var pageTitle = $('title').text();
    var color = {
        // white: '#FFFFFF',
        white: '#000000',
        red: '#FF0000',
        // green: '#00FF00', // green   : '#008000',
        green: '#1ecab8',
        blue: '#0000FF',
        // yellow: '#FFFF00',
        yellow: '#fbb624',
        magenta: '#FF00FF',
        cyan: '#00FFFF',
        gray: '#B2B2B2'
    };
    var commentary = [];
    var FeedStatus = {};
    var weatherFeed = {};
    var resetTime = new Date();
    resetTime.setTime(0);
    var timefeed = { running: false, remaining: resetTime, epoc: '' };
    var serverTime = new Date(0);
    var isIOS = ('platform' in navigator && (/iphone|ipod|ipad/gi).test(navigator.platform));
    var lastReceivedTime;

    

    var flagCurrent = true;
    var timelines = [];
    var timeStart;
    var timeEnd;

    var flagCalculateGAP_INT = false;

    var bestSorted = [];
    var virtualDrivers = [];
    var sortedRealDrivers = [];

    var flagSavingLocalStorage = true;
    var savedLocalStorageData = {};

    function get_ISODate(){
        sentTime = new Date();
        sentTime = sentTime.toISOString();
        sentTime = sentTime.substring(0, sentTime.length-1);
        return sentTime;
    }

    $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
        if (options.type.toLowerCase() == 'post') {
            options.data += '&csrfmiddlewaretoken='+$('input[name=csrfmiddlewaretoken]').val();
            if (options.data.charAt(0) == '&') {
                options.data = options.data.substr(1);
            }
        }
    });

    // ajax send message
    function ajax_send(data, method, message='', callback=null, url='/formula_2_3/ajax'){
        if(flagAjax){
            console.log("ajax message:", message);

            data.sentTime = get_ISODate();
            if(typeof addSavingLogs === "function") addSavingLogs(data.sentTime, message);
            
            $.ajax({
                url: url,
                type: 'POST',
                async: true,
                data: {
                    data: data,
                    method: method,
                    gameid: gameId
                },
                success: function(result){
                    // console.log("ajax result:", result);
                    if(callback) callback(result);
                }
            });
        }
        else{
            // console.log('ajax not available.');
        }
    }

    //
    function ajax_send_force(data, method, message='', callback=null){
        const tempAjax = flagAjax;
        flagAjax = true;
        ajax_send(data, method, message, callback);
        flagAjax = tempAjax;
    }

    function init() {

        lt.server.joinFeeds(series, ['data', 'weather', 'status', 'time', 'commentary','racedetails']);
        lt.server.getData2(series, ['data', 'statsfeed', 'weatherfeed', 'sessionfeed', 'trackfeed', 'commentaryfeed', 'timefeed', 'racedetailsfeed']).done(processData);

        reconnectCounter++;
        $('.connection-status').removeClass('reconnecting reconnected disconnected');
        $('.connection-status').addClass('connected');
        $('title').text(pageTitle);
    }

    function processData(data, flagForce = false) {
        if(!flagCurrent && !flagForce) return ;

        console.log("[processData]", data);// console log

        ajax_send(data, 'processData');

        var st;
        if (data.racedetailsfeed) {
            var csf = data.racedetailsfeed;
            lt.client.racedetailsfeed(csf[0], csf[1]);
        }
        if (data.data) {
            var d = data.data;
            st = d[0];
            var f1 = d[1];
            f1.lines = d[2];
            datafeedQueuing = false;
            lt.client.datafeed(st, 0, f1);
            queuedDataFeed.forEach(function (q) {
                if (q.sentTime > st)
                    lt.client.datafeed(q.sentTime, 0, q.feed);
            });
        }
        if (data.statsfeed) {
            st = data.statsfeed[0];
            var f2 = data.statsfeed[1];
            lt.client.statsfeed(st, f2);
        }
        if (data.sessionfeed) {
            st = data.sessionfeed[0];
            lt.client.sessionfeed(st, data.sessionfeed[1]);
        }
        if (data.trackfeed) {
            st = data.trackfeed[0];
            lt.client.trackfeed(st, data.trackfeed[1]);
        }
        if (data.weatherfeed) {
            st = data.weatherfeed[0];
            var p1 = data.weatherfeed[1];
            var p;
            for (p in p1) {
                if (p1.hasOwnProperty(p)) {
                    lt.client.weatherfeed(st, p, p1[p]);
                }
            }
            //weatherScope.$apply();
        }
        if (data.commentaryfeed) {
            commentary.length = 0;
            var cc = data.commentaryfeed[0];
            var n = 0;
            for (n; n < cc.length; n++)
                lt.client.comment(cc[n]);
        }
        if (data.timefeed) {
            var tt = data.timefeed;
            lt.client.timefeed(tt[0], tt[1], tt[2]);
            //            timefeed.epoc = tt[0];
            //            timefeed.running = tt[1];
            //            timefeed.remaining = parseTime(tt[2]);
        }

        bestSorted = getBestSortedDrivers();
        timingScope.bestSorted = bestSorted;
        sortedRealDrivers = getTableData(driverLines, virtualDrivers);
        timingScope.sortedRealDrivers = sortedRealDrivers;
        timingScope.$apply();
        // timingrootScope.$apply();
    }

    function zeroPad(num, places) {
        var zero = places - num.toString().length + 1;
        return Array(+(zero > 0 && zero)).join('0') + num;
    }

    if (!lt || !lt.client) return;

    lt.client.comment = function (msg) {
        // commentary.push({ 'text': msg }); 
        commentary.unshift({ 'text': msg }); // Show latest commentary on top
        // console.log('commentary: ' + msg);// console log
        ajax_send({message: msg}, 'comment', 'commentary: ' + msg);
        //$('#commentary').append('<p>' + msg + '</p>'); $('#commentary').scrollTop($('#commentary')[0].scrollHeight); };
    };

    lt.client.racedetailsfeed = function (sentTime, raceDetails) {
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        timingScope.roundSeason = raceDetails.Season;
        timingScope.roundNumber = raceDetails.Round;
        timingScope.roundRace = raceDetails.Race + ',';
        timingScope.roundCountry = raceDetails.Country;
        timingScope.roundCountryCode = raceDetails.CountryCode;
        timingScope.roundCircuit = raceDetails.Circuit;
        timingScope.roundDate = new Date(raceDetails.Date);
        timingScope.roundSession = raceDetails.Session;
        timingScope.day = zeroPad(timingScope.roundDate.getDate(), 2);
        timingScope.month = months[timingScope.roundDate.getMonth()];
        ajax_send({raceDetails : raceDetails, day : timingScope.day, month : timingScope.month}, 'racedetails', 'racedetails: ' + timingScope.day + ' ' + timingScope.month + 'Session is ' + timingScope.roundSession);
    }

    lt.client.timefeed = function (sentTime, freerun, value) {
        try {
            timefeed.epoc = sentTime;
            timefeed.running = freerun;
            timefeed.remaining = parseTime(value);
            $('#time').text(value);
            sentTime = parseF1Date(sentTime);
            if (serverTime < sentTime) serverTime = sentTime;
            // console.log('timefeed: ' + timefeed.epoc + ',' + timefeed.running + ',' + timefeed.remaining + ', serverTime: ' + serverTime);// console log
            ajax_send({epoc : sentTime, running : freerun, remaining : value},
                'timefeed', 'timefeed: ' + timefeed.epoc + ',' + timefeed.running + ',' + value + ', serverTime: ' + serverTime);
        }
        catch (ex) { console.error('outer', ex.message); }
    };

    FeedStatus.GetStatus = function () {
        // var that = this;
        switch (FeedStatus.session) {
            // for Flag icons we are using font-awsome icons 
            // removing unicode charecters for flags 
            case 'Finished': case 'Finalised': return '';
            case 'Aborted': return ''; // red
            case 'Started':
                switch (FeedStatus.track) {
                    case undefined:
                    case '1': return '';
                    case '2': return ''; // yellow
                    case '4': return 'SC';
                    case '5': return ''; //red
                    case '6': return 'VSC';
                    default: return '';
                }
                break;
            default: return '';
        }
    };
    FeedStatus.GetStatusColor = function () {
        // var that = this;
        switch (FeedStatus.session) {
            case 'Finished': case 'Finalised': return color.white;
            case 'Aborted': return color.red; // red
            case 'Started':
                switch (FeedStatus.track) {
                    case undefined:
                    case '1': return color.green;
                    case '2': return color.yellow; // yellow
                    case '4': return color.yellow;
                    case '5': return color.red; //red
                    case '6': return color.yellow;
                    default: return color.blue;
                }
                break;
            default: return color.gray;
        }
    };

    lt.client.sessionfeed = function (sentTime, value) {
        try {
            if (!FeedStatus.sessionTime || FeedStatus.sessionTime < sentTime) {
                FeedStatus.sessionTime = sentTime;
                FeedStatus.session = value.Value;
                // console.log('session->FeedStatus: ' + FeedStatus.sessionTime + ',' + FeedStatus.session);// console log
                ajax_send(FeedStatus, 'sessionfeed', 'session->FeedStatus: ' + FeedStatus.sessionTime + ',' + FeedStatus.session);
            }
        }
        catch (ex) { console.error('outer', ex.message); }
    };

    lt.client.trackfeed = function (sentTime, value) {
        try {
            if (!FeedStatus.trackTime || FeedStatus.trackTime < sentTime) {
                FeedStatus.trackTime = sentTime;
                FeedStatus.track = value.Value;
                // console.log('track->FeedStatus: ' + FeedStatus.trackTime + ',' + FeedStatus.track);// console log
                ajax_send(FeedStatus, 'trackfeed', 'track->FeedStatus: ' + FeedStatus.trackTime + ',' + FeedStatus.track);
            }
        }
        catch (ex) { console.error('outer', ex.message); }
    };

    lt.client.weatherfeed = function (sentTime, entry, value) {
        try {
            if (!weatherFeed[entry + 'Time'] || weatherFeed[entry + 'Time'] < sentTime) {
                weatherFeed[entry + 'Time'] = sentTime;
                weatherFeed[entry] = value;
                if (entry == 'winddir') {
                    var newVal = parseInt(value);
                    var oldVal = weatherFeed.windclock || 0;
                    var diff = (newVal - oldVal) % 360;
                    if (diff > 180) diff -= 360;
                    oldVal += diff;
                    weatherFeed.windclock = oldVal;
                }
                // console.log('weatherFeed: ' + entry + '=>' + sentTime + ',' + weatherFeed[entry]);// console log
                ajax_send(weatherFeed, 'weatherfeed', 'weatherFeed: ' + entry + '=>' + sentTime + ',' + weatherFeed[entry]);
            }
        }
        catch (ex) { console.error('outer', ex.message); }
    };


    var driverLines = [];


    var Driver = function (RacingNumber, session) {
        this.session = session;
        this.DriverPosition = {};
        this.Driver = {};
        this.Driver.RacingNumber = RacingNumber;
        this.DriverStatus = {};
        this.Sectors = [];
        this.LastLapTime = {};
        this.GetDriverName = function (tla) {
            if (tla) return this.Driver.TLA;
            if (!this.Driver.BroadcastName) return '';
            return this.Driver.BroadcastName.replace(' ', '.');
        };
        this.GetDriverNames = function (index) {
            if (index) {
                var bn = (this.Driver.BroadcastName) ? this.Driver.BroadcastName : '';
                var fn = (this.Driver.FullName) ? this.Driver.FullName : '';
                var tla = (this.Driver.TLA) ? this.Driver.TLA : '';
                var result = {
                    'BroadcastName': bn,
                    'FullName': fn,
                    'TLA': tla
                };
                return result;
            }
        };
    };
    Driver.prototype.GetRNColor = function () {
        return this.GetDriverColor();
    };
    Driver.prototype.GetDriverColor = function () {
        if (this.DriverStatus.InPit) return color.red;
        if (this.DriverStatus.PitOut) return color.red;
        if (this.DriverStatus.Stopped) return color.red;
        if (this.DriverStatus.Retired) return color.red;

        if (!this.DriverPosition.Show) return color.yellow;

        if (this.session == 'Race') {
            if (this.Number == 1) return color.white;
            var leader = GetLeader();
            if (!leader) return color.white;
            if (leader.NumberOfLaps == this.NumberOfLaps) return color.white;
            return color.yellow;
        }
        return color.white;
    };
    Driver.prototype.GetSectorText = function (n) {
        if (this.DriverStatus.InPit) {
            if (this.DriverStatus.ts && (this.DriverStatus.ts.getTime() + 10000) < serverTime.getTime())
                if (this.session == 'Race') {
                    if (n != 3) return '';
                    return ''; //'ss.t Ln';
                }
                else {
                    return GetDriverStatBestSector(this.Driver.RacingNumber, n);
                }
            else
                return '';
        }
        else if (this.DriverStatus.PitOut)
            return '';
        var sec = this.Sectors[n - 1];
        if (!sec) return '';
        if (sec.Stopped) return 'STOP';
        if (sec.Value == '.')
            return '';
        return sec.Value;
    };
    Driver.prototype.GetSectorColor = function (n) {
        if (this.DriverStatus.InPit) return color.red;
        if (this.DriverStatus.PitOut) return color.red;
        var sec = this.Sectors[n - 1];
        if (sec) {
            if (sec.Stopped) return color.red;
            if (sec.OverallFastest) return color.magenta;
            if (sec.PersonalFastest) return color.green;
            if (n < 3 && this.Sectors[n].Value != '.')
                return color.yellow;
        }
        return color.white;
    };
    Driver.prototype.GetBestLapTime = function () {
        // if (this.DriverStatus.Retired) return 'RETIRED';
        // if (this.DriverStatus.InPit) return 'IN PIT';
        // if (this.DriverStatus.PitOut) return 'OUT';
        // if (this.DriverStatus.Stopped) return 'STOP';

        var stat = driverStats[this.Driver.RacingNumber];
        if (!stat) return '';
        if (!stat.PersonalBestLapTime) return '';
        return stat.PersonalBestLapTime.Value;
    };
    Driver.prototype.GetBestLapTimeLap = function () {
        // if (this.DriverStatus.Retired) return 'RETIRED';
        // if (this.DriverStatus.InPit) return 'IN PIT';
        // if (this.DriverStatus.PitOut) return 'OUT';
        // if (this.DriverStatus.Stopped) return 'STOP';

        var stat = driverStats[this.Driver.RacingNumber];
        if (!stat) return '';
        if (!stat.PersonalBestLapTime) return '';
        return stat.PersonalBestLapTime.Lap;
    };
    Driver.prototype.GetBestLapTimeColor = function () {
        // if (this.DriverStatus.Retired) return color.red;
        // if (this.DriverStatus.InPit) return color.red;
        // if (this.DriverStatus.PitOut) return color.red;
        // if (this.DriverStatus.Stopped) return color.red;
        if (this.LastLapTime.OverallFastest) return color.magenta;
        if (this.LastLapTime.PersonalFastest) return color.green;
        return color.white;
    }
    Driver.prototype.GetRaceGap = function () {
        try {
            if (this.Number == 1) {
                if (this.NumberOfLaps > 0)
                    return 'LAP';
                return '';
            }
            if (!this.GapToLeader) return '';
            if (this.GapToLeader == '.') {
                var leader = GetLeader();
                if (!leader || !leader.NumberOfLaps || leader.NumberOfLaps == '.')
                    return '';
                var laps = this.NumberOfLaps;
                if (laps == '.') laps = 0;
                return (leader.NumberOfLaps - laps) + 'L';
            }
            return this.GapToLeader.replace('+', '');
        }
        catch (ex) { console.error(ex); }
    };
    Driver.prototype.GetRaceInterval = function () {
        if (this.Number == 1) return this.NumberOfLaps;
        if (!this.IntervalToPositionAhead) return '';
        if (this.IntervalToPositionAhead == '.') {
            var numberAhead = this.Number - 1;
            var ahead = GetDriverAtPosition(numberAhead);
            if (!ahead || !ahead.NumberOfLaps || ahead.NumberOfLaps == '.')
                return '';
            var laps = this.NumberOfLaps;
            if (laps == '.') laps = 0;
            return (ahead.NumberOfLaps - laps) + 'L';
        }
        return this.IntervalToPositionAhead.replace('+', '');
    };
    Driver.prototype.GetRaceLapTime = function () {
        if (this.DriverStatus.Retired) return 'RETIRED';
        if (this.DriverStatus.InPit) return 'IN PIT';
        if (this.DriverStatus.PitOut) return 'OUT';
        if (this.DriverStatus.Stopped) return 'STOP';
        return this.LastLapTime.Value;
    };
    Driver.prototype.GetRaceLapTimeColour = function () {
        if (this.DriverStatus.Retired) return color.red;
        if (this.DriverStatus.InPit) return color.red; //limited time
        if (this.DriverStatus.Stopped) return color.red;
        if (this.DriverStatus.PitOut) {
            if (this.Sectors.length > 0 && this.Sectors[0].Value == '.') return color.red;
            return color.yellow;
        }
        if (this.LastLapTime.OverallFastest) return color.magenta;
        if (this.LastLapTime.PersonalFastest) return color.green;
        if (this.Sectors.length > 2 && this.Sectors[2].Value != '.') return color.white;
        return color.yellow;
    };
    Driver.prototype.Update = function (line) {
        if (line.Number) this.Number = line.Number;
        if (line.position) this.DriverPosition = line.position;
        if (line.driver.FullName) this.Driver = line.driver;
        if (line.status) { this.DriverStatus = line.status; if (this.DriverStatus.ts) this.DriverStatus.ts = parseF1Date(this.DriverStatus.ts); else this.DriverStatus.ts = new Date(); }
        if (this.session == 'Practice' || this.session == 'GPQualifying') { // and gp-Q
            //            if (line.TimeDiffToFastest) this.TimeDiffToFastest = line.TimeDiffToFastest;
            //            if (line.TimeDiffToPositionAhead) this.TimeDiffToPositionAhead = line.TimeDiffToPositionAhead;
            if (line.gapP) this.TimeDiffToFastest = line.gapP.Value;
            if (line.intervalP) this.TimeDiffToPositionAhead = line.intervalP.Value;
        }
        else if (this.session == 'F1Qualifing') { // f1
            if (line.QualifyingStatus) this.QualifyingStatus = line.QualifyingStatus;
            var n = 1;
            for (n; n <= 3; n++) {
                if (line['TimeDiffToFastestQ' + n]) this['TimeDiffToFastestQ' + n] = line['TimeDiffToFastestQ' + n].Value;
                if (line['TimeDiffToPositionAheadQ' + n]) this['TimeDiffToPositionAheadQ' + n] = line['TimeDiffToPositionAheadQ' + n].Value;
            }
        }
        else if (this.session == 'Race') {
            if (line.gap) this.GapToLeader = line.gap.Value;
            if (line.interval) this.IntervalToPositionAhead = line.interval.Value;
        }
        if (line.laps) this.NumberOfLaps = line.laps.Value;
        if (line.pits) this.NumberOfPitStops = line.pits.Value;
        //        if (line.sectors) for (var sector in line.sectors.sectors) if (line.sectors.sectors.hasOwnProperty(sector)) this.Sectors[parseInt(line.sectors.sectors[sector].Id)-1] = line.sectors.sectors[sector];
        if (line.sectors) {
            for (var sector in line.sectors) {
                if (line.sectors.hasOwnProperty(sector)) {
                    this.Sectors[parseInt(line.sectors[sector].Id) - 1] = line.sectors[sector];
                }
            }
        }
        if (line.last) this.LastLapTime = line.last;
    };

    function GetDriverAtPosition(pos) {
        if (pos)
            return driverLines.find(function (elm) { return elm && elm.Number == pos; });
    }
    function GetLeader() {
        return GetDriverAtPosition(1);
    }

    function UpdateDriver(lineUpdate) {
        if (lineUpdate.driver === undefined || lineUpdate.driver === null) return; // preventing ugly IE throwing errors
        var RacingNumber = lineUpdate.driver.RacingNumber;
        var line = driverLines[RacingNumber];
        if (!line) {
            line = new Driver(RacingNumber, timingScope.feed.Session);
            driverLines[RacingNumber] = line;
        }
        line.Update(lineUpdate);
        if (timingScope) timingScope.$apply();
    }

    var queuedDataFeed = [];
    var datafeedQueuing = true;
    var cutOffTime = {};

    lt.client.datafeed = function (sentTime, lineNo, feed) {
        if (datafeedQueuing) {
            queuedDataFeed.push({ 'sentTime': sentTime, 'feed': feed });
            return;
        }
        try {
            sentTime = parseF1Date(sentTime);
            if (serverTime < sentTime) serverTime = sentTime;
            if (feed && feed.Session) {
                /* if (feed.Series == 'F2' || feed.Series == 'GP2') {
                    timingScope.heading = 'Formula 2 ' + feed.Session + ' Session';
                }
                else {
                    timingScope.heading = feed.Series + ' Series ' + feed.Session + ' Session';
                } */
                var seriesName = "";
                if (feed.Series == "F2") {
                    seriesName = "Formula 2 ";
                }
                if (feed.Series == "F3") {
                    seriesName = "Formula 3 ";
                }
                timingScope.heading = feed.Session == "Race" ? seriesName + "Race" : seriesName + feed.Session + " Session";
                
                if (feed.Session == 'Race'){
                    timingScope.feed.Session = 'Race';
                    timingScope.feed.Session1 = 'Race';
                    flagCalculateGAP_INT = true;
                }
                else{
                    timingScope.feed.Session = 'GPQualifying';
                    timingScope.feed.Session1 = 'Race';
                }
            }
            if (feed !== null && feed.lines !== null) {
                var flines = feed.lines;
                var n;
                for (n in flines) {
                    if (!Array.isArray(flines) && !flines.hasOwnProperty(n)) continue;
                    var line = flines[n];
                    UpdateDriver(line);
                }
            }
            if (typeof feed.cutOffTime !== 'undefined') {
                if (feed.cutOffTime.Value !== '.' && feed.cutOffTime.Value !== '') {
                    cutOffTime.data = feed.cutOffTime;
                }
            }

            if (!timingScope.linesSorted) {
                timingScope.linesSorted = [];
            }
            timingScope.linesSorted.length = 0;
            var n1 = 0;
            for (n1; n1 < driverLines.length; n1++) {
                var line1 = driverLines[n1];
                if (line1 !== undefined)
                    timingScope.linesSorted[parseInt(line1.Number)] = line1;
            }

            bestSorted = getBestSortedDrivers();
            timingScope.bestSorted = bestSorted;
            sortedRealDrivers = getTableData(driverLines, virtualDrivers);
            timingScope.sortedRealDrivers = sortedRealDrivers;

            if (timingScope) timingScope.$apply();
            
            ajax_send(feed, 'datafeed', 'datafeed: ' + sentTime + ',' + driverLines.length);
        }
        catch (ex) { console.error('outer', ex.message); }
    };

    var DriverStat = function (RacingNumber) {
        this.Driver = { 'RacingNumber': RacingNumber };
        this.BestSectors = [];
        this.BestSpeeds = [];
        this.PersonalBestLapTime = {Lap: '', Position: '', Value: ''};
    };

    DriverStat.prototype.Update = function (stat) {
        if (stat.Number) this.Number = stat.Number;
        if (stat.PersonalBestLapTime) this.PersonalBestLapTime = stat.PersonalBestLapTime;
        if (stat.BestSectors) {
            var n;
            for (n in stat.BestSectors) {
                var sec = stat.BestSectors[n];
                this.BestSectors[sec.Id] = sec;
            }
        }
        if (stat.BestSpeeds) {
            var n1;
            for (n1 in stat.BestSpeeds) {
                var sec1 = stat.BestSpeeds[n1];
                this.BestSpeeds[sec1.Id] = sec1;
            }
        }
    };

    function GetDriverStatBestSector(RacingNumber, sector) {
        var stat = driverStats[RacingNumber];
        if (!stat) return '';
        var sec = stat.BestSectors[sector];
        if (!sec) return '';
        if (sec.Value == '.') return '';
        return sec.Value;
    }

    var driverStats = [];
    var driverStatScope = {};

    var driverStatsSpeeds = [];

    var DriverStatData = function (RacingNumber, data) {
        this.RacingNumber = RacingNumber;
        this.data = data;
    };

    DriverStatData.prototype.GetDriverNames = function (index) {
        var driver = driverLines[index];
        if (typeof driver !== 'undefined') {
            return driver.GetDriverNames(index);
        }
    };

    lt.client.statsfeed = function (sentTime, feed) {
        var flines = feed;
        if (feed.lines)
            flines = feed.lines;
        if (flines) {
            var n;
            for (n in flines) {
                if (!Array.isArray(flines) && !flines.hasOwnProperty(n)) continue;
                var stat = flines[n];
                if (stat.driver === undefined || stat.driver === null) return;
                var RacingNumber = stat.driver.RacingNumber;
                var line = driverStats[RacingNumber];
                if (!line) {
                    line = new DriverStat(RacingNumber);
                    driverStats[RacingNumber] = line;
                }
                line.Update(stat);

                if (typeof driverStatScope.bestLap === 'undefined') {
                    driverStatScope.bestLap = new DriverStatData(RacingNumber, line.PersonalBestLapTime);
                    var rn = driverStatScope.bestLap['RacingNumber'];
                    driverStatScope.bestLap.names = driverStatScope.bestLap.GetDriverNames(rn);
                } else {
                    if (isBetter(driverStatScope.bestLap.data, line.PersonalBestLapTime)) {
                        driverStatScope.bestLap = new DriverStatData(RacingNumber, line.PersonalBestLapTime);
                        var rn1 = driverStatScope.bestLap['RacingNumber'];
                        driverStatScope.bestLap.names = driverStatScope.bestLap.GetDriverNames(rn1);
                    }
                }

                var n1;
                for (n1 in line.BestSpeeds) {
                    var sector = line.BestSpeeds[n1];
                    var pos = parseInt(sector.Position);
                    if (pos <= 6) {
                        if (!driverStatsSpeeds[pos]) driverStatsSpeeds[pos] = [];
                        driverStatsSpeeds[pos][sector.Id] = new DriverStatData(RacingNumber, sector.Value);
                        var rn2 = driverStatsSpeeds[pos][sector.Id]['RacingNumber'];
                        driverStatsSpeeds[pos][sector.Id].names = driverStatsSpeeds[pos][sector.Id].GetDriverNames(rn2);
                    }
                }
            }

            ajax_send(flines, 'statsfeed', 'statsfeed: ' + sentTime + ',' + flines.length);
        }
    };
    function isBetter(oldTime, testTime) {
        if (testTime.Lap === '' || testTime.Position === '' || testTime.Value === '') return false;

        var l, r;
        l = parseTime(oldTime.Value);
        r = parseTime(testTime.Value);
        if (l < r) return false;
        if (l > r) return true;

        l = parseInt(oldTime.Lap);
        r = parseInt(testTime.Lap);
        if (l < r) return false;
        if (l > r) return true;

        l = parseInt(oldTime.Position);
        r = parseInt(testTime.Position);
        if (l < r) return false;
        if (l > r) return true;

        return false;
    }

    function getDriverParam(number, driverValues, param){
        let result = 'Number'+number;
        if(driverValues.length > 0){
            driverValues.forEach((driver) => {
                if(parseInt(driver.Driver.RacingNumber) === parseInt(number)){
					// if(param === "BroadcastName") result = driver.Driver.BroadcastName;
					if(param === "BroadcastName") result = driver.GetDriverName(true);
					else if(param === "DriverPosition") result = driver.DriverPosition.Value;
				}
            });
        }
        return result;
    }

    function getBestSortedDrivers(){
        let currentLists = bestSorted;
        let driverValues = driverLines;

        // console.log("getBestSortedDrivers", currentLists, driverLines, driverStats);

        if(driverStats.length > 0){
            let tempLists = driverStats.map((driver) => {
                return {
                    bestLapTime: driver.PersonalBestLapTime.Value,
                    number : driver.Driver.RacingNumber,
                    name : getDriverParam(driver.Driver.RacingNumber, driverValues, "BroadcastName"),
                    positionOld : driver.PersonalBestLapTime.Position,
                    position : getDriverParam(driver.Driver.RacingNumber, driverValues, "DriverPosition"),
                    lap : driver.PersonalBestLapTime.Lap,
                    points : ((getDriverParam(driver.Driver.RacingNumber, driverValues, "DriverPosition") <= 10) ? "YES": "NO")
                };
            });
    
            tempLists.forEach((driver) => {
                let flag = true;

                if(driver.bestLapTime == "") flag = false;

                if(currentLists.length > 0) currentLists.forEach((list) => {
                    if(driver.number === list.number && driver.lap === list.lap) flag = false;
                });

                if(flag){
                    currentLists.push(driver);
                }
            });

            let resultLists = [];
            resultLists = currentLists.sort((a, b) => {
                return parseTime(a.bestLapTime) - parseTime(b.bestLapTime);
            });

            if(resultLists.length > 10) resultLists = resultLists.slice(0, 10);

            return resultLists;
        }

        return currentLists;
    }

    function getSelectedRealDriverKeys() {
        let selectedDriverKeys = [];
        $("#table-board input[type=checkbox]").each(function(index){
            if(this.checked){
                let selectedName = $(this).attr("id").substring(16);
                driverLines.forEach((driver, index) => {
                    if (driver.GetDriverName(false) === selectedName) {
                        selectedDriverKeys.push("" + index + " : " + selectedName);
                    }
                });
            }
        });
        return selectedDriverKeys;
    }

    function addVirtualDriver(selectRealDriverIds, gapToAdd, virtualDriverNames, selectColor){
        if (!selectRealDriverIds.length || selectRealDriverIds.length != virtualDriverNames.length) {
            warningAlert("You must select & input corect numbers of Drivers.");
            return ;
        }

        selectRealDriverIds.forEach((selectRealDriverId, i) => {
            let virtualDriverName = virtualDriverNames[i];

            let virtualDriver = {
                initialRacingNumber : driverLines[selectRealDriverId].Driver.RacingNumber,
                gapToAdd : gapToAdd,
                name : virtualDriverName,
                colorValue : selectColor
            };

            $("#table-board input[type=checkbox]").each(function(index){
                this.checked = false;
            });

            if(virtualDrivers.find((driver) => {return driver.name === virtualDriver.name})){
                warningAlert("You must input the Different name of virtual Driver.");
            }
            else{
                virtualDrivers.push(virtualDriver);
                sortedRealDrivers = getTableData(driverLines, virtualDrivers);
                timingScope.sortedRealDrivers = sortedRealDrivers;
                timingScope.$apply();
                successAlert("A virtual Driver has added now.");
            }
        });
    }

    function deleteVirtualDrivers(keys){
        let nextDrivers = [];
        nextDrivers = virtualDrivers
          .filter((driver) => {
            return !keys.find((key) => {
              return (driver.name === key);
            });
          })
          .map((driver) => driver);
        virtualDrivers = nextDrivers;
        sortedRealDrivers = getTableData(driverLines, virtualDrivers);
        timingScope.sortedRealDrivers = sortedRealDrivers;
        timingScope.$apply();
    }

    function getCurrentSector(realDriver){
        if(parseFloat(realDriver.GetSectorText(3)) > 0) return 3;
        if(parseFloat(realDriver.GetSectorText(2)) > 0) return 2;
        if(parseFloat(realDriver.GetSectorText(1)) > 0) return 1;
        return null;
    }

    function getCompareTwoSectors(driverOne, driverTwo){
        let currentSectorOne, currentSectorTwo, currentSector;
        currentSectorOne = getCurrentSector(driverOne);
        currentSectorTwo = getCurrentSector(driverTwo);
        if(currentSectorOne && currentSectorTwo){
            currentSector = Math.min(currentSectorOne, currentSectorTwo);
            if(currentSector < 3) return getCompareTwoParameters(driverOne.GetSectorText(currentSector), driverTwo.GetSectorText(currentSector));
        }
        return 0;
    }

    function getValueByFormat(value){
        if(!isNaN(value) && value > 0) return "+".concat(Math.round(value * 10) / 10);
        else if(!isNaN(value) && value < 0) return (Math.round(value * 10) / 10);
        return value;
    }

    function getGAPFromRealDriver(realDriver){
        let gap;
        if(parseInt(realDriver.DriverPosition.Value) === 1) gap = 0;
        else{
            gap = (timingScope.feed.Session === 'Race') ? realDriver.GapToLeader : realDriver.TimeDiffToFastest;
            if(flagCalculateGAP_INT && parseFloat(gap)){
                gap = getValueByFormat(parseFloat(gap) + parseFloat(getCompareTwoSectors(realDriver, GetLeader())));
            }
        }
        return gap;
    }

    function getIntervalFromRealDriver(realDriver){
        let interval, previousDriver;
        if(parseInt(realDriver.DriverPosition.Value) === 1) interval = 0;
        else{
            interval = (timingScope.feed.Session === 'Race') ? realDriver.IntervalToPositionAhead : realDriver.TimeDiffToPositionAhead;
            if(flagCalculateGAP_INT && parseFloat(interval)){
                previousDriver = GetDriverAtPosition(realDriver.DriverPosition.Value - 1);
                if(previousDriver){
                    interval = getValueByFormat(getGAPFromRealDriver(realDriver) - getGAPFromRealDriver(previousDriver));
                }
            }
        }
        return interval;
    }

    function getGAPFromVirtualDriver(realDriver, virtualDriver){
        let gap;
        if((parseFloat((getGAPFromRealDriver(realDriver))) || (parseFloat((getGAPFromRealDriver(realDriver)))===0)) && (parseFloat(virtualDriver.gapToAdd) || (parseFloat(virtualDriver.gapToAdd)===0))){
            gap = getValueByFormat(parseFloat((getGAPFromRealDriver(realDriver))) + parseFloat(virtualDriver.gapToAdd));
        }
        else{
            gap = ((getGAPFromRealDriver(realDriver)));
        }
        return gap;
    }

    function getIntervalFromVirtualDriver(virtualDriver){
        let interval;
        interval = "+".concat(Math.round(virtualDriver.gapToAdd * 10) / 10);
        return interval;
    }

    function getTableData(realDrivers, virtualDrivers){
        // console.log("[getTableData] get table data", realDrivers, virtualDrivers, timingScope.feed.Session);
    
        let index = 0;
        let findPos, findGAP, temp, tempNames;
        let mergeDrivers = [];
        let sortDrivers = [];
        let oldSortedRealDrivers = sortedRealDrivers;

        // presort from realdrivers
        // let tempRealDrivers = [];
        // realDrivers.forEach(d => {
        //     let t = d;
        //     let pos = 0;
        //     let gap = parseFloat(getGAPFromRealDriver(d));
        //     realDrivers.forEach(dd => {
        //         if(parseFloat(getGAPFromRealDriver(dd)) < gap) pos ++;
        //     });
        // });
        // let positionString = "";
        // realDrivers.forEach(d => positionString += d.GetDriverName(true) + ":" + d.DriverPosition.Value + "/" + getGAPFromRealDriver(d) + ", ");
        // console.log(positionString);
        
        realDrivers.forEach((realDriver) => {
            let flagHasFocusClass = false;
            let realDriverName = realDriver.GetDriverName(false);
            let indexKeyValue = "real-" + realDriverName.replace(" ", "");
            let findOldSortedRealDrivers = oldSortedRealDrivers.find(d => d.indexKey === indexKeyValue);
            if(findOldSortedRealDrivers) flagHasFocusClass = findOldSortedRealDrivers.hasFocusClass;

            mergeDrivers[index] = {
                indexKey : indexKeyValue,
                pos : realDriver.DriverPosition.Value,
                number : realDriver.Driver.RacingNumber,
                // name : realDriver.Driver.BroadcastName,
                name : realDriverName,
                shortName : realDriver.GetDriverName(true),
                GAP : getGAPFromRealDriver(realDriver),
                INT : getIntervalFromRealDriver(realDriver),
                BEST : realDriver.GetBestLapTime(),
                // S1 : realDriver.Sectors[0].Value,
                S1 : realDriver.GetSectorText(1),
                // S2 : realDriver.Sectors[1].Value,
                S2 : realDriver.GetSectorText(2),
                // S3 : realDriver.Sectors[2].Value,
                S3 : realDriver.GetSectorText(3),
                LAPTIME : realDriver.LastLapTime.Value,
                LAP : realDriver.NumberOfLaps,
                PIT : realDriver.NumberOfPitStops,
                colorValue : null,
                color : realDriver.GetBestLapTimeColor(),
                color1 : realDriver.GetSectorColor(1),
                color2 : realDriver.GetSectorColor(2),
                color3 : realDriver.GetSectorColor(3),
                isReal : true,
                hasFocusClass : flagHasFocusClass
            };
            index++;
            virtualDrivers.forEach((virtualDriver) => {
                flagHasFocusClass = false;
                indexKeyValue = "virtual-" + virtualDriver.name.replace(" ", "");
                findOldSortedRealDrivers = oldSortedRealDrivers.find(d => d.indexKey === indexKeyValue);
                if(findOldSortedRealDrivers) flagHasFocusClass = findOldSortedRealDrivers.hasFocusClass;

                if(realDriver.Driver.RacingNumber === virtualDriver.initialRacingNumber){
                mergeDrivers[index] = {
                    indexKey : indexKeyValue,
                    pos : realDriver.DriverPosition.Value,
                    number : realDriver.Driver.RacingNumber,
                    name : virtualDriver.name,
                    shortName : virtualDriver.name.slice(0,5),
                    GAP : getGAPFromVirtualDriver(realDriver, virtualDriver),
                    INT : getIntervalFromVirtualDriver(virtualDriver),
                    BEST : realDriver.GetBestLapTime(),
                    // S1 : realDriver.Sectors[0].Value,
                    S1 : realDriver.GetSectorText(1),
                    // S2 : realDriver.Sectors[1].Value,
                    S2 : realDriver.GetSectorText(2),
                    // S3 : realDriver.Sectors[2].Value,
                    S3 : realDriver.GetSectorText(3),
                    LAPTIME : realDriver.LastLapTime.Value,
                    LAP : realDriver.NumberOfLaps,
                    PIT : realDriver.NumberOfPitStops,
                    colorValue : virtualDriver.colorValue,
                    color : realDriver.GetBestLapTimeColor(),
                    color1 : realDriver.GetSectorColor(1),
                    color2 : realDriver.GetSectorColor(2),
                    color3 : realDriver.GetSectorColor(3),
                    isReal : false,
                    hasFocusClass : flagHasFocusClass
                };
                index++;
                }
            });
        });
        // console.log(mergeDrivers);
        
        index = 0;
        sortDrivers = mergeDrivers.map((driver) => {
          if(!driver.isReal && parseFloat(driver.GAP)){
            findPos = driver.pos;
            findGAP = 0;
            mergeDrivers.forEach((tempDriver) => {
              if(tempDriver.isReal && parseFloat(tempDriver.GAP) && parseFloat(tempDriver.GAP) < parseFloat(driver.GAP) && (parseFloat(tempDriver.GAP) > findGAP || (parseFloat(tempDriver.GAP) === findGAP && parseInt(tempDriver.pos) > findPos))){
                findPos = parseInt(tempDriver.pos);
                findGAP = parseFloat(tempDriver.GAP);
              }
            });
            // console.log("Virtual Driver : " + driver.name + " position is " + findPos);
            driver.pos = findPos;
          }
          return driver;
        });
        // console.log(sortDrivers);
    
        mergeDrivers = [];
        tempNames  = [];
        for(index = 0, findPos = 1; index < sortDrivers.length;){
          temp = null;
          // eslint-disable-next-line
          sortDrivers.forEach((driver) => {
            if(!driver.isKnown && parseInt(driver.pos) === findPos && tempNames.indexOf(driver.name) < 0){
              if(temp === null){
                temp = driver;
              }
              else{
                if(parseFloat(driver.GAP) && parseFloat(temp.GAP) && parseFloat(driver.GAP) < parseFloat(temp.GAP)) temp = driver;
              }
            }
          });
          if(temp === null){
            findPos ++;
          }
          else{
            temp.pos = index + 1;
            if(index > 0 && !temp.isReal && parseFloat(temp.GAP) && parseFloat(mergeDrivers[index-1].GAP)){
              temp.INT = "+".concat(Math.round((parseFloat(temp.GAP) - parseFloat(mergeDrivers[index-1].GAP)) * 10) / 10);
            }
            if(index > 0 && !mergeDrivers[index-1].isReal && parseFloat(temp.GAP) && parseFloat(mergeDrivers[index-1].GAP)){
              mergeDrivers[index-1].INT = mergeDrivers[index-1].INT + " | -" + Math.round((parseFloat(temp.GAP) - parseFloat(mergeDrivers[index-1].GAP)) * 10) / 10;
            }
            mergeDrivers[index] = temp;
            tempNames.push(temp.name);
            index ++;
          }
        }
    
        sortedRealDrivers = mergeDrivers;
        // console.log("[getTableData] sorted Real Drivers", sortedRealDrivers);

        // save sorted drivers to local stroage
        if (flagSavingLocalStorage) {
            saveLocalStorage();
        }

        // draw circle map drivers
        if (GDriver.IS_ENABLE) {
            GDriver.resetDrivers(sortedRealDrivers);
        }

        // render charts
        if (CustomApexChart.IS_ENABLE) {
            chartRenderAnalysis();
            chartRenderAnalysisGAP();
            chartRenderCharts();
        }
        
        return sortedRealDrivers;
    }

    // save local storage
    // store parameters : [{ Driver.number : [{ LAP : [LAPTIME, SECTOR1, SECTOR2, SECTOR3] }] }]
    function saveLocalStorage() {
        let currentRoundTitle = "formula_"+timingScope.roundSeason+"_"+timingScope.roundRace+"_"+timingScope.month+"_"+timingScope.day+"_"+timingScope.roundSession;
        let data = {};
        
        console.log("[save local storage]", currentRoundTitle);

        // clear old formula store
        let keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.substr(0, 8) === "formula_" && k != currentRoundTitle) localStorage.removeItem(k);
        });

        // read old data
        data = localStorage.getItem(currentRoundTitle);
        try {
            if (data) data = JSON.parse(data);
            else data = {};
        }
        catch(e) {
            data = {};
        }

        // update data
        if (sortedRealDrivers && sortedRealDrivers.length) {
            sortedRealDrivers.forEach(d => {
                if (!d.isReal) return;
                let no = d.number;
                let lap = d.LAP;
                if (!data[no]) data[no] = {};
                if (!data[no][lap]) data[no][lap] = [];
                if (d.LAPTIME && d.LAPTIME != "") {
                    // lap | 0 => LAPTIME
                    data[no][lap][0] = "" + (parseTime(d.LAPTIME).getTime() / 1000);
                }
                data[no][lap][1] = d.S1;    // lap | 1 => SECTOR1
                data[no][lap][2] = d.S2;    // lap | 2 => SECTOR2
                data[no][lap][3] = d.S3;    // lap | 3 => SECTOR3
                data[no][lap][4] = d.GAP;   // lap | 4 => GAP
            });
        }

        savedLocalStorageData = data;

        // save new data
        localStorage.setItem(currentRoundTitle, JSON.stringify(data));
    }
    
    
    var selectedCompareDrivers = [];
    var compareDriversValues = {
        AP : null,
        BP : null,
        AAPP : null,
        BBPP : null
    };

    function getEmptyParams(){
        return {
            GAP : 'NULL',
            INT : 'NULL',
            S1 : 'NULL',
            S2 : 'NULL',
            S3 : 'NULL',
            TIME : 'NULL',
            GAPColor : '#000000',
            INTColor : '#000000',
            S1Color : '#000000',
            S2Color : '#000000',
            S3Color : '#000000',
            TIMEColor : '#000000'
        };
    }

    function getColorFromParams(param){
        return (parseFloat(param)>0)?'#f93b7a':((parseFloat(param)<0)?'#29e446':'#000000');
    }

    function getCompareTwoParameters(paramOne, paramTwo){
        let floatOne = parseFloat(paramOne);
        let floatTwo = parseFloat(paramTwo);
        if(isNaN(floatOne) || isNaN(floatTwo)) return "NULL";
        else return (floatOne > floatTwo) ? "+".concat(Math.round((floatOne - floatTwo) * 100) / 100) : Math.round((floatOne - floatTwo) * 100) / 100;
    }

    function getCompareTwoDrivers(driverOne, driverTwo){
        if(driverOne != null && driverTwo != null && Object.keys(driverOne).length > 0 && Object.keys(driverTwo).length > 0){
            let gap = getCompareTwoParameters(getGAPFromRealDriver(driverOne), getGAPFromRealDriver(driverTwo));
            // Specially INTERVAL
            let interval;
            if(driverOne.DriverPosition.Value < driverTwo.DriverPosition.Value){
                interval = getCompareTwoParameters(getIntervalFromRealDriver(driverTwo), getIntervalFromRealDriver(driverOne));
            }
            else{
                interval = getCompareTwoParameters(getIntervalFromRealDriver(driverOne), getIntervalFromRealDriver(driverTwo));
            }
            let s1 = getCompareTwoParameters(driverOne.GetSectorText(1), driverTwo.GetSectorText(1));
            let s2 = getCompareTwoParameters(driverOne.GetSectorText(2), driverTwo.GetSectorText(2));
            let s3 = getCompareTwoParameters(driverOne.GetSectorText(3), driverTwo.GetSectorText(3));
            let time = getCompareTwoParameters(parseTime(driverOne.LastLapTime.Value)/1000, parseTime(driverTwo.LastLapTime.Value)/1000);
            return {
                GAP : gap,
                INT : interval,
                S1 : s1,
                S2 : s2,
                S3 : s3,
                TIME : time,
                GAPColor : getColorFromParams(gap),
                INTColor : getColorFromParams(interval),
                S1Color : getColorFromParams(s1),
                S2Color : getColorFromParams(s2),
                S3Color : getColorFromParams(s3),
                TIMEColor : getColorFromParams(time)
            };
        }
        return getEmptyParams();
    }

    function refreshCompareDrivers(){
        compareDriversValues.AP = getCompareTwoDrivers(selectedCompareDrivers['P'], selectedCompareDrivers['A']);
        compareDriversValues.BP = getCompareTwoDrivers(selectedCompareDrivers['P'], selectedCompareDrivers['B']);
        compareDriversValues.AAPP = getCompareTwoDrivers(selectedCompareDrivers['PP'], selectedCompareDrivers['AA']);
        compareDriversValues.BBPP = getCompareTwoDrivers(selectedCompareDrivers['PP'], selectedCompareDrivers['BB']);
        timingScope.compareDrivers = compareDriversValues;
        timingScope.$apply();
    }


    // timer
    var Timer = function(){
        this.startTime = null;
        this.endTime = null;
        this.currentTime = null;
        this.oldTime = null;
        this.timeoutRef = null;
        this.stopped = false;
        this.sliderBar = null;
        var that = this;

        this.run = function(){// run timer clock
            if(that.timeoutRef) clearInterval(that.timeoutRef);
            that.getDataByCurrentTime(that.intToTime(that.currentTime));
            if(that.sliderBar){
                that.setSliderBarValue(that.sliderBar, that.intToPercent(that.currentTime));
            }
            $("#slider-player .range-handle").attr("title", that.intToTime(that.currentTime));
            that.currentTime ++;
            // console.log("current time is " + that.intToTime(that.currentTime));
            that.timeoutRef = setInterval(function(){
                if(that.stopped || that.currentTime > that.endTime){
                    return ;
                } 
                that.run();
            }, 1000);
        };

        this.timeToInt = function(t){ // your input string formatted time to integer
            var a = t.split(':'); // split it at the colons
            return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); // minutes are worth 60 seconds. Hours are worth 60 minutes.
        };
        this.intToTime = function(i){
            var hours = Math.floor((i % (60 * 60 * 24)) / (60 * 60)); 
            var minutes = Math.floor((i % (60 * 60)) / (60)); 
            var seconds = Math.floor((i % (60)));
            return ("0" + hours).slice(-2) + ":" + ("0" + minutes).slice(-2) + ":" + ("0" + seconds).slice(-2);
        };
        this.percentToInt = function(p){
            if(p >= 0 && p <= 100 && this.startTime && this.endTime) return Math.floor(p * (this.endTime - this.startTime) / 100 + this.startTime);
            return 0;
        };
        this.intToPercent = function(i){
            if(this.startTime && this.endTime && i >= this.startTime && i <= this.endTime) return Math.floor(100 * (i - this.startTime) / (this.endTime - this.startTime));
            return 0;
        };
    };

    Timer.prototype.start = function(){
        this.startTime = this.timeToInt(timeStart);
        this.endTime = this.timeToInt(timeEnd);
        this.currentTime = this.startTime;
        this.stopped = false;
        this.run();
    };

    Timer.prototype.play = function(){
        if(this.currentTime){
            this.stopped = false;
            this.run();
        }
        else{
            this.start();
        }
        // replay controller show
        $("#slider-player, #spinner-replay").removeAttr("hidden");
        $("#btn-replay .spinner-title").text("Replaying...");
    };

    Timer.prototype.pause = function(){
        this.stopped = true;
        $("#spinner-replay").attr("hidden", "hidden");
    };

    Timer.prototype.stop = function(){
        this.currentTime = this.startTime;
        this.setSliderBarValue(this.sliderBar, this.intToPercent(this.currentTime));
        this.stopped = true;
        $("#spinner-replay").attr("hidden", "hidden");
        clearDrivers();
    };

    Timer.prototype.reset = function(percent){
        this.currentTime = this.percentToInt(percent);
    };

    Timer.prototype.setSliderBar = function(initSlider){
        this.sliderBar = initSlider;
    };

    // set slider bar value via current time
    Timer.prototype.setSliderBarValue =function(sliderInstance, newValue) {
        if(newValue < parseInt(sliderInstance.options.min) || newValue > parseInt(sliderInstance.options.max)) return ;
        var changed = false;
        var offset;
        var maxValue = parseInt(sliderInstance.options.max);
        var minValue = parseInt(sliderInstance.options.min);
        var stepIndex;
        var stepsArr = (sliderInstance.options.step) ? sliderInstance.steps : null;
        var value = (sliderInstance.options.decimal) ? (Math.round(newValue * 100) / 100) : Math.round(newValue);
      
        if (!sliderInstance.options.step) {
            var persentNewValueOfVal = (newValue - minValue) * 100 / (maxValue - minValue);
            offset = (sliderInstance.slider.offsetWidth - sliderInstance.handle.offsetWidth) * persentNewValueOfVal / 100;
        } else {
            stepIndex = ( (value - minValue)/sliderInstance.options.step ).toFixed(0);
            offset = stepsArr[+stepIndex];
        }
      
        changed = (sliderInstance.element.value != value) ? true : false;
        sliderInstance.setPosition(offset);
        sliderInstance.element.value = value;
        // sliderInstance.options.callback();
        if (changed) sliderInstance.changeEvent();
    };

    // About timeline
    // get data via current time
    Timer.prototype.getDataByCurrentTime = function(nowTime){
        if(flagCurrent || !timelines) return ;

        let flagReload = false;
        let prevTime = 0;
        let data = null;

        if(this.oldTime){
            let count = 0, tempT;
            let nowTimeToInt = this.timeToInt(nowTime);
            let minVal = Math.min(this.timeToInt(this.oldTime), nowTimeToInt);
            let maxVal = Math.max(this.timeToInt(this.oldTime), nowTimeToInt);
            for(let t in timelines){
                tempT = this.timeToInt(t);
                if(tempT > minVal && tempT < maxVal) count++;
                if(tempT < nowTimeToInt && tempT > prevTime) prevTime = tempT;
            }
            if(count > 0) flagReload = true;
        }
        else{
            flagReload = true;
        }

        if(!this.oldTime || this.oldTime != nowTime || flagReload){
            if(timelines[nowTime]){        
                data = timelines[nowTime];
            }
            else if(flagReload && prevTime > 0){
                data = timelines[this.intToTime(prevTime)];
            }

            if(data){
                data['flag_reload'] = flagReload;
                ajax_send_force(data, 'get_data', 'get data from database', function(result){
                    // get feed datas from database
                    try{
                        let processDatas = JSON.parse(result);
                        if(processDatas && processDatas.length > 0){
                            processDatas.forEach(d => processData(d, true));
                        }
                    }
                    catch(ex){
                    }
                });

                this.oldTime = nowTime;
            }
        }
    };

    var timer = new Timer();

    
    function clearDrivers(){
        driverLines = [];
        bestSorted = [];
        driverStats = [];
        driverStatScope = {};
        driverStatsSpeeds = [];
    }


    var timingScope;
    var weatherScope;
    var timingrootScope;
    // var commnetaryScope; unused variable

    var timingApp = angular.module('timing', []);
    timingApp.controller('page', function ($scope, $timeout) {
        timingrootScope = $scope.$root;
        $scope.feed = { 'Session': '' };
        timingScope = $scope;
        $scope.lines = driverLines;
        $scope.driverStatScope = driverStatScope;
        $scope.driverStatsSpeeds = driverStatsSpeeds;
        $scope.cutOffTime = cutOffTime;

        $scope.bestSorted = bestSorted;
        $scope.sortedRealDrivers = sortedRealDrivers;
        $scope.compareDrivers = compareDriversValues;
        
        
        // initialize main layout
        $scope.initMainLayout = function(){

            $timeout(function(){

                $(function() {
           
                    // topbar
                    jConveyorTickerTest();

                    // analysis
                    chartRenderAnalysis();

                    // analysis_gap
                    chartRenderAnalysisGAP();

                    // chart page
                    chartRenderCharts();

                });
            });

        };

        // get difference between a postion gap and b position gap
        // of sortedRealDrivers
        $scope.getDifferenceGAP = function(a, b){
            let driverA = sortedRealDrivers.find(d => d.pos == a);
            let driverB = sortedRealDrivers.find(d => d.pos == b);
            if(driverA && driverB){
                return getCompareTwoParameters(driverA.GAP, driverB.GAP);
            }
            return "NULL";
        };

        // custom selected driver position
        $scope.getPositionFromName = function(name){
            let driverF = sortedRealDrivers.find(d => d.name == name);
            if(driverF) return driverF.pos;
            return null;
        }

        $scope.setPositionFromName = function(name){
            $scope.customSelectedDriverName0 = name;
            $scope.customSelectedDriverPosition = $scope.getPositionFromName($scope.customSelectedDriverName0);
        }

        $scope.setPositionFromName1 = function(name){
            $scope.customSelectedDriverName01 = name;
            $scope.customSelectedDriverPosition1 = $scope.getPositionFromName($scope.customSelectedDriverName01);
        }

        $scope.$watch('sortedRealDrivers', function() {
            $scope.customSelectedDriverPosition = $scope.getPositionFromName($scope.customSelectedDriverName0);
            $scope.customSelectedDriverPosition1 = $scope.getPositionFromName($scope.customSelectedDriverName01);
        }, true);
    });

    timingApp.controller('weather', function ($scope) {
        weatherScope = $scope;
        $scope.weather = weatherFeed;
    });

    timingApp.controller('commentary', function ($scope) {
        commentaryScope = $scope;
        $scope.commentary = commentary;
    });

    timingApp.controller('status', function ($scope) {
        $scope.status = FeedStatus;
    });


    angular.bootstrap(document, ['timing']);

    function parseF1Date(d) {
        var re, match;
        re = /^(\d+)\/(\d+)\/(\d{4}) (\d+):(\d+):(\d+).(\d+)$/;
        match = d.match(re);
        if (match) {
            return new Date(match[3], match[2] - 1, match[1], match[4], match[5], match[6], match[7]);
        }
        re = /^(\d{4})-(\d+)-(\d+)T(\d+):(\d+):(\d+).(\d+)$/;
        match = d.match(re);
        if (match) {
            return new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6], match[7]);
        }
        return new Date(NaN);
    }

    function parseTime(t) {
        try{
            var mss = t.split('.');
            var s = mss[0].split(':');
            var ret = 0;
            var n = 0;
            for (n; n < s.length; n++)
                ret = ret * 60 + parseInt(s[n]);
            ret *= 1000;
            if (mss.length > 1)
                ret += parseInt(mss[1]);
            return new Date(ret);
        }
        catch(e){
            return null;
        }
    }

    function pad2(s) {
        return ('0' + s).slice(-2);
    }

    function displayTime(t) {
        return pad2(t.getUTCHours()) + ':' + pad2(t.getUTCMinutes()) + ':' + pad2(t.getUTCSeconds());
    }

    function timeConversion(millisec) {
        var seconds = (millisec / 1000).toFixed(1);
        var minutes = (millisec / (1000 * 60)).toFixed(1);
        var hours = (millisec / (1000 * 60 * 60)).toFixed(1);
        var days = (millisec / (1000 * 60 * 60 * 24)).toFixed(1);
        if (seconds < 60) {
            return seconds + " Sec";
        } else if (minutes < 60) {
            return minutes + " Min";
        } else if (hours < 24) {
            return hours + " Hrs";
        } else {
            return days + " Days"
        }
    }
    
    setInterval(function () {
        serverTime.setTime(serverTime.getTime() + 1000);
        if (typeof timefeed.running !== 'string' && timefeed.running === true) {
            timefeed.remaining.setTime(timefeed.remaining.getTime() - 1000);
        }
        FeedStatus.countdown = displayTime(timefeed.remaining);
        if (timingScope) timingScope.$apply();
    }, 1000);

    if (connectionHubUrl === undefined) {
        // $.connection.hub.url = '/streaming';
        $.connection.hub.url = 'https://ltss.fiaformula2.com/streaming';
    }
    else {
        $.connection.hub.url = connectionHubUrl;
    }
    
    function startConnection(){
        // $.connection.hub.logging = true;
        var t = new Date();
        $.connection.hub.start({ withCredentials: false, reconnectDelay: 5000 }).done(function(context){
            var newT = new Date();
            var diff = newT - t;
            _gaq.push(['_trackEvent', 'timetaken', 'connect', timeConversion(diff)]);
            _gaq.push(['_trackEvent', 'connectionType', context.transport.name, context.transport.name]);
            _gaq.push(['_trackEvent', 'connection', 'connected', 'connected']);

            init();
        });   
    }
    startConnection();

    $.connection.hub.received(function(data){
        lastReceivedTime = new Date();
        // _gaq.push(['_trackEvent', 'feed', 'received', 'received']);
    });
    $.connection.hub.connectionSlow(function() {
        _gaq.push(['_trackEvent', 'connection', 'slow', 'slow']);
    });

    $.connection.hub.reconnecting(function () {
        tryingToReconnect = true;
        _gaq.push(['_trackEvent', 'connection', 'reconnecting', 'reconnecting']);
        $('.connection-status').removeClass('reconnected connected disconnected');
        $('.connection-status').addClass('reconnecting');
    });

    $.connection.hub.reconnected(function () {
        tryingToReconnect = false;
        _gaq.push(['_trackEvent', 'connection', 'reconnected', 'reconnected']);
        startConnection();
        $('.connection-status').removeClass('reconnecting connected disconnected');
        $('.connection-status').addClass('reconnected');
    });

    $.connection.hub.disconnected(function () {
        _gaq.push(['_trackEvent', 'connection', 'disconnected', 'disconnected']);
        if (tryingToReconnect) {
            if (reconnectCounter <= 30) {
                setTimeout(function () { startConnection(); }, 1000);
            } else {
                // notify user for disconnections
                _gaq.push(['_trackEvent', 'connection', 'stopped', 'stopped']);
                $('.connection-status').removeClass('reconnected reconnecting connected');
                $('.connection-status').addClass('disconnected');
            }
        }
    });

    $(window).unload(function() {
      _gaq.push(['_trackEvent', 'connection', 'closed', 'closed']);
    });

    visibly.onVisible(function() {
        // if last received data is older than 6 minutes than abort connection and recreate new connetion.
        if(typeof lastReceivedTime != 'undefined') {
            var diffMs = (lastReceivedTime - new Date());
            var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
            if (diffMins >= 6) {
                $.connection.hub.stop();
                _gaq.push(['_trackEvent', 'connection', 'aborted', 'aborted']);
                setTimeout(function () { startConnection(); }, 1000);
            }    
        }
    });

    visibly.onHidden(function () {
    });


    // jquery functions

    // sweet alerts
    function successAlert(text){
        swal({
            title: 'Success!',
            text: text,
            type: 'success',
            showCancelButton: false,
            confirmButtonClass: 'btn btn-success',
            cancelButtonClass: 'btn btn-danger ml-2'
        });
    }

    function warningAlert(text, callback=null){
        if(callback){
            swal({
                title: 'Warning',
                text: text,
                type: 'warning',
                animation: true
            }).then(callback);
        }
        else{
            swal({
                title: 'Warning',
                text: text,
                type: 'warning',
                animation: true
            });
        }
    }

    function passingAlert(text, keys){
        swal({
            title: 'Are you sure?',
            text: text,
            type: 'warning',
            showCancelButton: true,
            confirmButtonClass: 'btn btn-success',
            cancelButtonClass: 'btn btn-danger ml-2',
            confirmButtonText: 'Yes, delete it!'
        }).then(function () {
            deleteVirtualDrivers(keys);
            swal(
                'Deleted!',
                'Virtual drivers have been deleted.',
                'success'
            )
        });
    }

    // topbar - conveyor
    function jConveyorTickerTest() {
        if(!document.getElementsByClassName("js-conveyor-example")) return ;
                        
        var settings = {
            anim_duration: 200,
            reverse_elm: true,
            force_loop: false
        };
        var cycle_duration = settings.anim_duration;
        var reverse_commute = settings.reverse_elm;
        var initialization_forced = settings.force_loop;
        
        $('.js-conveyor-example').each(function(){
            var $wrap = $(this);
            var $list = $wrap.children('ul');

            $list
            .css({
                'margin': '0',
                'padding': '0',
                'list-style': 'none'
            })
            .children('li')
            .css({
                'display': 'inline-block'
            });

            var $listRawWidth = $list.width();
            var $parentWidth = $list.parent().width();
            var $parent1stThreshold = ($parentWidth / 2) - 20;

            $list
            .removeAttr('style')
            .children('li')
            .removeAttr('style');

            $wrap.addClass('jctkr-wrapper');

            var conveyorInit = function(){
                var $listItems1stClone = $list.clone().children('li');
                $list.append($listItems1stClone);

                var listTotalWidth = 0;
                $list.children().each(function(){
                    listTotalWidth += $(this).outerWidth();
                });
                $list.width(listTotalWidth);

                var conveyorAnimate = function(action){
                    var tw = $list.width();
                    var tp = $list.position().left;
                    var operator = '-';
                    var direction = 'normal';
                    var tcal;

                    if (action !== undefined && action === 'reverse'){
                        tcal = (tw / 2);
                        if (tp > 0){
                            $list.css('left', '-' + tcal + 'px');
                            conveyorAnimate('reverse');
                            return;
                        }
                        operator = '+';
                        direction = 'reverse';
                    }
                    else {
                        tcal = -1 * (tw / 2);
                        if (tp < tcal){
                            var toffs = -1 * (tcal - tp);
                            $list.css('left', toffs + 'px');
                            conveyorAnimate(direction);
                            return;
                        }
                    }

                    $list.animate({
                        left: operator + '=10px'
                    }, cycle_duration, 'linear', function(){
                        conveyorAnimate(direction);
                    });
                };

                $wrap
                .hover(function(){
                    $list.stop();
                }, function(){
                    $list.stop();
                    conveyorAnimate('normal');
                });

                if ( reverse_commute ){
                    $wrap.prev('.jctkr-label')
                    .hover(function(){
                        $list.stop();
                        conveyorAnimate('reverse');
                    }, function(){
                        $list.stop();
                        conveyorAnimate('normal');
                    }).click(function(){
                        return false;
                    });
                }
                conveyorAnimate('normal');
            };

            if ( $listRawWidth >= $parent1stThreshold ){
                conveyorInit();
            }
            else if ( initialization_forced ){
                var $itemsWidth, $containerWidth = 0;
                var itemsReplicate = function(){
                    var $listItems1stClone = $list.clone().children('li');
                    $list.append($listItems1stClone);

                    $itemsWidth = $list.width();
                    $containerWidth = $list.parent().width();

                    if ( $itemsWidth < $containerWidth ){
                        itemsReplicate();
                    }
                    else {
                        conveyorInit();
                        return false;
                    }
                };

                itemsReplicate();

                while ( $itemsWidth < $containerWidth ) {
                    if ( $itemsWidth >= $parent1stThreshold ) {
                        conveyorInit();
                        break;
                    }
                    itemsReplicate();
                }
            }
            $wrap.addClass('jctkr-initialized');
        });
    }


    /**
     *      circle map
     */
    // Graph Driver class
    var GDriver = function(driver) {
        this.driver = driver;       // sorted driver
        this.GAP = 0;               // GAP float value
        this.LAP = 0;               // LAP int value
        this.position = 0;          // radian value
        this.$element = null;       // element of driver in circle map
        this.indexKey = '';         // indexKey of driver
        this.label = '';            // label of element
        this.class = '';            // class name for color, etc
        this.id = '';               // id of element
        this.x = 0;                 // x value of element
        this.y = 0;                 // y value of element
        this.isWaiting = false;     // flag waiting

        this.initDriver();
        console.log("create new GDriver");
    };

    // enable circle map
    GDriver.IS_ENABLE = false;
    // redraw circle map step milliseconds
    GDriver.STEP_REDRAW = 1000;
    // min speed
    GDriver.MIN_SPEED = 0.01;
    // max speed
    GDriver.MAX_SPEED = 0.5;
    // radius of circles
    GDriver.CIRCLE_RADIUS = [100, 85, 70];
    // current LAP
    GDriver.CURRENT_LAP = 0;
    // total laptime
    GDriver.TOTAL_LAPTIME = 100000;
    // S1 position
    GDriver.S1_POSITION = 2;
    // S2 position
    GDriver.S2_POSITION = 4.28;
    // first position
    GDriver.FIRST_POSITION = 0;
    // first speed
    GDriver.FIRST_SPEED = 0;
    // first S
    GDriver.FIRST_S = 0;


    // list of GDrivers
    var gDrivers = [];


    // initialize driver
    GDriver.prototype.initDriver = function() {
        this.position = 0;
        this.indexKey = this.driver.indexKey;
        if (this.driver.indexKey.slice(0, 8) == 'virtual-') {
            // virtual driver
            if (this.driver.colorValue.indexOf("bg-success") >= 0) {
                this.class = 'p3';
            }
            else if (this.driver.colorValue.indexOf("bg-dark") >= 0) {
                this.class = 'p2';
            }
            else if (this.driver.colorValue.indexOf("bg-warning") >= 0) {
                this.class = 'p1';
            }
            else if (this.driver.colorValue.indexOf("bg-info") >= 0) {
                this.class = 'lmp3';
            }
            else if (this.driver.colorValue.indexOf("bg-primary") >= 0) {
                this.class = 'lmp2';
            }
            else if (this.driver.colorValue.indexOf("bg-danger") >= 0) {
                this.class = 'lmp1';
            }
            // this.label = this.driver.indexKey.replace('GHOST_', '').slice(8,10);
            this.label = this.driver.number;
        }
        else {
            // real driver
            this.class = '';
            this.label = this.driver.number;
        }

        this.setDriver(this.driver);
    };

    // set driver
    GDriver.prototype.setDriver = function(driver) {
        this.driver = driver;
        // GAP
        let gapFloat = parseFloat(this.driver.GAP);
        if (isNaN(gapFloat)) gapFloat = 0;
        this.GAP = gapFloat * 1000;
        // LAP
        let lap = parseInt(this.driver.LAP);
        if (isNaN(lap)) lap = 0;
        this.LAP = lap;
        // pos = id
        this.id = parseInt(this.driver.pos);
        // console.log(this.id, this.label, this.driver.LAP, this.LAP, this.GAP);

        this.setPosition();
    };

    // draw graph car
    GDriver.prototype.drawCar = function () {
        this.$element = $('svg.radar g#car-id-'+this.id);
        if (this.$element.length) {
            let className = '';
            if (this.id == 1) {
                // first driver set different color
                className = 'car car-class-inv';
            }
            else {
                className = 'car car-class-'+this.class;
            }

            // caculate x, y
            let circle, r;
            if (this.LAP == GDriver.CURRENT_LAP) circle = 0;
            else if (this.LAP == GDriver.CURRENT_LAP - 1) circle = 1;
            else circle = 2;
            r = GDriver.CIRCLE_RADIUS[circle];
            this.x = r * Math.sin(this.position);
            this.y = - r * Math.cos(this.position);

            // draw
            this.$element.attr('class', className);
            this.$element.removeAttr('hidden');
            this.$element.find('line').attr('x2', this.x);
            this.$element.find('line').attr('y2', this.y);
            this.$element.find('circle').attr('cx', this.x);
            this.$element.find('circle').attr('cy', this.y);
            this.$element.find('text').attr('x', this.x);
            this.$element.find('text').attr('y', this.y);
            this.$element.find('text').text(this.label);
        }
    }

    // set position of first
    // calculate by speed, S
    GDriver.prototype.setPositionFirst = function() {
        // LAPTIME to milliseconds
        let lapmilisec = parseTime(this.driver.LAPTIME).getTime();
        // total laptime
        if (!isNaN(lapmilisec) && lapmilisec > 0) GDriver.TOTAL_LAPTIME = lapmilisec;
        // speed
        GDriver.FIRST_SPEED = 2 * Math.PI / GDriver.TOTAL_LAPTIME;
        // LAP
        GDriver.setLAP(this.LAP);

        // S1, S2, S3
        let s1 = parseFloat(this.driver.S1),
            s2 = parseFloat(this.driver.S2),
            s3 = parseFloat(this.driver.S3),
            new_s_part = 0;
        // S position
        if (!isNaN(s1)) GDriver.S1_POSITION = 2 * Math.PI * s1 / GDriver.TOTAL_LAPTIME;
        if (!isNaN(s2)) GDriver.S2_POSITION = GDriver.S1_POSITION + 2 * Math.PI * s2 / GDriver.TOTAL_LAPTIME;
        // s_part
        if (isNaN(s3) && !isNaN(s2)) new_s_part = 2;
        else if (isNaN(s2) && !isNaN(s1)) new_s_part = 1;

        if (GDriver.FIRST_S != new_s_part) {
            // by S
            GDriver.FIRST_S = new_s_part;
            if (new_s_part == 0) GDriver.FIRST_POSITION = 0;
            else if (new_s_part == 1) GDriver.FIRST_POSITION = GDriver.S1_POSITION;
            else if (new_s_part == 2) GDriver.FIRST_POSITION = GDriver.S2_POSITION;
        }
        else {
            // by speed
            GDriver.FIRST_POSITION = GDriver.FIRST_POSITION + GDriver.FIRST_SPEED * GDriver.STEP_REDRAW;
        }
    };

    // set position
    GDriver.prototype.setPosition = function() {
        if (this.id == 1) {
            // first driver
            this.setPositionFirst();
            this.position = GDriver.FIRST_POSITION;
        }
        else if ((this.GAP == 0) && (this.LAP < GDriver.CURRENT_LAP - 1)) {
            // stop
        }
        else {
            // others moving
            // calculate by GAP
            this.position = GDriver.FIRST_POSITION - GDriver.FIRST_SPEED * this.GAP;
        }
    }

    // set current LAP
    GDriver.setLAP = function(lap) {
        if (!isNaN(lap) && lap > 0) {
            GDriver.CURRENT_LAP = lap;
            $('text#lap-0').text('Lap ' + lap);
            $('text#lap-1').text('Lap ' + (lap-1));
        }
    }

    // reset sorted drivers to GDrivers
    GDriver.resetDrivers = function(drivers) {
        if (GDriver.IS_ENABLE) {
            drivers.forEach(d => {
                var gd = gDrivers.find(gd => gd.indexKey == d.indexKey);
                if (gd) {
                    gd.setDriver(d);
                    gd.isWaiting = false;
                }
                else {
                    gd = new GDriver(d);
                    gDrivers.push(gd);
                }
            });
            // check until waiting
            gDrivers = gDrivers.filter(gd => {
                let flag = !gd.isWaiting;
                gd.isWaiting = true;
                return flag;
            });
        }
    }

    // draw circle map
    GDriver.drawMap = function() {
        if (GDriver.IS_ENABLE) {
            // console.log("redraw circle map");
            $('svg.radar g.car').attr('hidden', 'hidden');
            gDrivers.forEach(d => {
                d.setPosition();
                d.drawCar();
            });
        }
    }


    /**
     * Custom Apex Chart Class
     * enabled types : ["line", "bar"]
     */
    var CustomApexChart = function(element, type, options={}) {
        this.element = document.querySelector(element);
        if (this.element) {
            this.isEnabled = true;
            CustomApexChart.IS_ENABLE = true;
        }
        else this.isEnabled = false;
        this.type = type;
        this.chart = null;
        this.isRendered = false;
        this.series = {};
        this.xAxis = [];
        this.data = {};
        this.yAxisMin = 0;
        this.yAxisMax = 100;
        this.yValueMin = 1e10;
        this.yValueMax = -1e10;
        this.xAxisTitle = "";
        this.setDefaultOptions();
        this.setOptions(options);
    };

    // is enalbed
    CustomApexChart.IS_ENABLE = false;
    // random color list
    CustomApexChart.COLOR_LIST_COUNT = 100;
    CustomApexChart.COLOR_LIST = [];
    // step of axis
    CustomApexChart.STEP_AXIS = 10;

    // get random color
    CustomApexChart.prototype.getRandomColor = function(isStatic=true) {
        if (isStatic) {
            // generate color list
            if (CustomApexChart.COLOR_LIST.length == 0) {
                for (let i = 0; i < CustomApexChart.COLOR_LIST_COUNT; i ++) {
                    CustomApexChart.COLOR_LIST.push(this.getRandomColor(false));
                }
            }

            // get color from list
            let index = Object.keys(this.series).length % CustomApexChart.COLOR_LIST.length;
            return CustomApexChart.COLOR_LIST[index];
        }
        else {
            // generate random color
            var letters = '0123456789ABCDEF';
            var color = '#';
            for (var i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
    };

    // set default options by type
    CustomApexChart.prototype.setDefaultOptions = function() {
        this.options = {};

        if (this.type == "line") {
            // line chart
            this.options = {
                chart:
                {
                    height: 300,
                    type: "line",
                    zoom:
                    {
                        enabled: false
                    },
                    toolbar:
                    {
                        show: false
                    }
                },
                colors: [],
                dataLabels:
                {
                    enabled: true
                },
                stroke:
                {
                    width: 3,
                    curve: "smooth"
                },
                series: [],
                title:
                {
                    text: "",
                    align: "left"
                },
                grid:
                {
                    row:
                    {
                        colors: [],
                        opacity: .2
                    },
                    borderColor: "#f1f3fa"
                },
                markers:
                {
                    style: "inverted",
                    size: 6
                },
                xaxis:
                {
                    categories: [],
                    title:
                    {
                        text: ""
                    }
                },
                yaxis:
                {
                    title:
                    {
                        text: ""
                    },
                    min: this.yAxisMin,
                    max: this.yAxisMax
                },
                legend:
                {
                    position: "top",
                    horizontalAlign: "right",
                    floating: true,
                    offsetY: -25,
                    offsetX: -5
                },
                responsive: [
                {
                    breakpoint: 600,
                    options:
                    {
                        chart:
                        {
                            toolbar:
                            {
                                show: false
                            }
                        },
                        legend:
                        {
                            show: false
                        }
                    }
                }]
            };
            return true;
        }
        else if (this.type == "bar") {
            // bar chart
            this.options = {
                chart:
                {
                    height: 300,
                    type: "bar",
                    toolbar:
                    {
                        show: false
                    }
                },
                plotOptions:
                {
                    bar:
                    {
                        horizontal: false,
                        endingShape: "rounded",
                        columnWidth: "55%"
                    }
                },
                dataLabels:
                {
                    enabled: false
                },
                stroke:
                {
                    show: true,
                    width: 2,
                    colors: ["transparent"]
                },
                colors: [],
                series: [],
                xaxis:
                {
                    categories: []
                },
                legend:
                {
                    offsetY: -10
                },
                yaxis:
                {
                    title:
                    {
                        text: ""
                    },
                    min: this.yAxisMin,
                    max: this.yAxisMax
                },
                fill:
                {
                    opacity: 1
                },
                grid:
                {
                    row:
                    {
                        colors: [],
                        opacity: .2
                    },
                    borderColor: "#f1f3fa"
                }
            };
            return true;
        }

        return false;
    };

    // set options by options
    // parameters : ["title", "height", "xAxisTitle", "yAxisTitle", "yAxisMin", "yAxisMax"]
    CustomApexChart.prototype.setOptions = function(options={}) { 
        if ("title" in options) {
            this.options['title'] = {...this.options['title'], 'text' : options['title']};
            this.xAxisTitle = options['title'];
            delete options["title"];
        }
        if ("height" in options) {
            this.options['chart'] = {...this.options['chart'], 'height' : options['height']};
            delete options["height"];
        }
        if ("xAxisTitle" in options) {
            this.options['xaxis'] = {...this.options['xaxis'], 'title' : {'text' : options['xAxisTitle']}};
            delete options["xAxisTitle"];
        }
        if ("yAxisTitle" in options) {
            this.options['yaxis'] = {...this.options['yaxis'], 'title' : {'text' : options['yAxisTitle']}};
            delete options["yAxisTitle"];
        }
        if ("yAxisMin" in options) {
            this.yAxisMin = options['yAxisMin'];
            delete options["yAxisMin"];
        }
        if ("yAxisMax" in options) {
            this.yAxisMax = options['yAxisMax'];
            delete options["yAxisMax"];
        }

        if (Array.isArray(this.options['yaxis']) && this.options['yaxis'].length) this.options['yaxis'] = this.options['yaxis'][0];
        this.options['yaxis'] = {
            ...this.options['yaxis'], 
            'min' : this.yAxisMin, 
            'max' : this.yAxisMax
        };
        this.options = {
            ...this.options,
            ...options
        };
        // console.log("[CustomApexChart set options]", this.options);

        if (this.isRendered) {
            this.chart.updateOptions(this.options);
        }
    };

    // set series
    CustomApexChart.prototype.setSeries = function(series) {
        // update series
        for (let key in series) {
            let value = {'name' : series[key]};
            if (key in this.series) {
                // update series
                value = {...this.series[key], value};
            }
            else {
                // create new series
                value['color'] = this.getRandomColor();
                value['gridColor'] = "transparent";
            }
            this.series[key] = value;
        }

        // update options
        let colors = [], seriesData = [], grid = [], seriesDataOptions = {};
        for (let key in this.series) {
            if (!(key in series)) {
                delete this.series[key];
                continue;
            }
            let value = this.series[key];
            colors.push(value['color']);
            seriesData.push({'name' : value['name'], 'data' : []});
            grid.push(value['gridColor']);
        }
        seriesDataOptions = {
            colors : colors,
            series : seriesData,
            grid : {
                row : {
                    colors : grid,
                    opacity: this.options['grid']['row']['opacity'] || .2
                },
                borderColor: this.options['grid']['borderColor'] || "#f1f3fa"
            },
        };
        // console.log("[CustomApexChart set Series]", seriesDataOptions);
        this.setOptions(seriesDataOptions);
    };

    // set xAxis
    CustomApexChart.prototype.setXAxis = function(xAxis) {
        // update xAxis
        if (Array.isArray(xAxis)) {
            // replace
            this.xAxis = xAxis;
        }
        else {
            // add
            this.xAxis.push(xAxis);
        }

        // update options
        this.setOptions({
            xaxis : {
                categories : this.xAxis,
                title : this.options['xaxis']['title']
            }
        });
    };

    // set data
    CustomApexChart.prototype.setData = function(data, reloadForce=false) {
        // update data
        for (let key in data) {
            let value = data[key];
            if (key in this.series) {
                this.data[key] = value;
            }
        }

        // update series data
        let seriesData = [];
        for (let key in this.series) {
            seriesData.push({
                name : this.series[key]['name'],
                data : this.data[key] || []
            });
        }
        this.reloadData(reloadForce);
        this.setOptions({
            series : seriesData
        });
        if (this.isRendered) {
            // console.log("[CustomApexChart set Data]", seriesData);
            this.chart.updateSeries(seriesData);
        }
    };

    // calculate yMin from yValueMin
    CustomApexChart.calcYAxisMin = function(yValueMin) {
        return parseInt((yValueMin + 1) / CustomApexChart.STEP_AXIS - 1) * CustomApexChart.STEP_AXIS;
    }

    // calculate yMax from yValueMax
    CustomApexChart.calcYAxisMax = function(yValueMax) {
        return parseInt((yValueMax - 1) / CustomApexChart.STEP_AXIS + 1) * CustomApexChart.STEP_AXIS;
    }

    // reaload data
    CustomApexChart.prototype.reloadData = function(force=false) {
        for (let key in this.series) {
            if (key in this.data) {
                this.data[key].forEach(val => {
                    if (this.yValueMin > val) this.yValueMin = val;
                    if (this.yValueMax < val) this.yValueMax = val;
                });
            }
        }
        if (force) {
            this.yAxisMin = CustomApexChart.calcYAxisMin(this.yValueMin);
            this.yAxisMax = CustomApexChart.calcYAxisMax(this.yValueMax);
            if (this.yAxisMax < this.yAxisMin) {
                this.yAxisMax = this.yAxisMin + CustomApexChart.STEP_AXIS;
            }
        }
        console.log("[CustomApexChart reaload data]", this.yValueMin, this.yValueMax, this.yAxisMin, this.yAxisMax);
    };

    // chart render
    CustomApexChart.prototype.render = function() {
        if (!this.isEnabled || this.isRendered) return false;
        this.chart = new ApexCharts(this.element, this.options);
        this.chart.render();
        this.isRendered = true;
    };


    var gameAllData;
    var gameTimesValues;
    var gameLapsValues;
    var gameData;
    var gameLaps;
    var logLastGameId;

    // get datas for analysis from database
    function getDatasAnalysis(callback){
        if (!chartAnalysis || !chartAnalysis.isEnabled) return;

        gameData = [];
        gameLaps = [];

        var xAxisTitle = chartAnalysis.xAxisTitle;

        if(!logLastGameId || logLastGameId != lastGameId){
            // reload data
            ajax_send_force({session_id : lastGameId}, 'analysis', 'get data of analysis', function(result){
                gameAllData = [];
                gameTimesValues = [];
                gameLapsValues = [];
                let data = {};
                let countGameLaps = 0;

                try{
                    // data = JSON.parse(result);
                    data = result;
                }
                catch(ex){
                }

                console.log(data);
                
                if(data && data.data && data.data.length > 0){
                    if(data.game && data.game.title && $("#analysis-graph-title").length){
                        $("#analysis-graph-title").text(data.game.title);
                    }

                    data.data.forEach(d => {
                        if(d.laps != undefined && d.RacingNumber && d.laps >= 0 && d.RacingNumber > 0){
                            if(countGameLaps < d.laps) countGameLaps = d.laps;
                            let flagChange = true;
                            if(d.laps > 0 && gameTimesValues[d.laps-1] && gameTimesValues[d.laps-1] > d.created_at) flagChange = false;
                            if(gameTimesValues[d.laps+1] && gameTimesValues[d.laps+1] < d.created_at) flagChange = false;
                            if(flagChange) gameTimesValues[d.laps] = d.created_at;
                            gameLapsValues[d.laps] = d.laps;
                            if(!gameAllData[d.RacingNumber]) gameAllData[d.RacingNumber] = [];
                            gameAllData[d.RacingNumber][d.laps] = {
                                'LAP' : parseTime(d.lastValue).getTime()/1000,
                                'BEST' : parseTime(d.bestValue).getTime()/1000,
                                'S1' : parseInt(d.sector1),
                                'S2' : parseInt(d.sector2),
                                'S3' : parseInt(d.sector3)
                            };
                        }
                    });

                    if(gameAllData.length > 0){
                        logLastGameId = lastGameId;
                        gameAllData = gameAllData.map(g => {
                            gameLapsValues.forEach(i => {
                                if(!g[i]) g[i] = {
                                    'LAP' : 0,
                                    'BEST' : 0,
                                    'S1' : 0,
                                    'S2' : 0,
                                    'S3' : 0
                                };
                            });
                            return g;
                        });
                    }
                }

                console.log('gameLapsValues is ', gameLapsValues, 'gameAllData is ', gameAllData);

                if(xAxisTitle == "LAP"){
                    gameLaps = gameLapsValues;
                }
                else if(xAxisTitle == "TIME"){
                    gameLaps = gameTimesValues;
                }

                driverLines.forEach(driver => {
                    if(driver && driver.Number){
                        gameData.push({
                            number : driver.Driver.RacingNumber,
                            name : driver.GetDriverName(false),
                            data : (gameAllData[driver.Driver.RacingNumber])?
                                gameAllData[driver.Driver.RacingNumber].map(g => {
                                    if(g[yAxisTitle] && !isNaN(g[yAxisTitle])) return g[yAxisTitle];
                                    else return 0;
                                })
                                :
                                [],
                        });
                    }
                });
                console.log("gameLaps is ", gameLaps, "gameData is ", gameData);

                callback();
            });
        }
        else {
            // not reload data
            if(xAxisTitle == "LAP"){
                gameLaps = gameLapsValues;
            }
            else if(xAxisTitle == "TIME"){
                gameLaps = gameTimesValues;
            }

            driverLines.forEach(driver => {
                if(driver && driver.Number){
                    gameData.push({
                        number : driver.Driver.RacingNumber,
                        name : driver.GetDriverName(false),
                        data : (gameAllData[driver.Driver.RacingNumber])?
                            gameAllData[driver.Driver.RacingNumber].map(g => {
                                if(g[yAxisTitle] && !isNaN(g[yAxisTitle])) return g[yAxisTitle];
                                else return 0;
                            })
                            :
                            [],
                    });
                }
            });

            callback();
        }
    }


    var checkedChartDrivers = [];
    var checkedChartDriversChanged = true;

    // checked charts drivers
    function getCheckedChartDrivers() {
        let oldStatus = "", newStatus = "";
        oldStatus = checkedChartDrivers.join("");
        checkedChartDrivers = [];
        if($(".check-chart-driver").length){
            $(".check-chart-driver").each(function(){
                if($(this).prop("checked")) checkedChartDrivers.push(parseInt($(this).attr('id').replace("customCheck", "")));
            });
        }
        newStatus = checkedChartDrivers.join("");
        checkedChartDriversChanged = (oldStatus != newStatus);
        return checkedChartDrivers;
    }


    var chartAnalysis = null;

    var sliderAnalysis = null;

    // analysis page - chart
    function chartRenderAnalysis(flagYAXISOnly=false){
        if(!document.getElementById("apex_line1")) return ;

        if (!chartAnalysis) {
            // create chart analysis
            var options = {
                chart: {
                    shadow: {
                        enabled: false,
                        color: '#bbb',
                        top: 3,
                        left: 2,
                        blur: 3,
                        opacity: 1
                    },
                },
                xaxis: {
                    type: 'number',
                },
                title: {
                    style: {
                        fontSize: "16px",
                        color: '#666'
                    }
                },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shade: 'dark',
                        gradientToColors: ['#43cea2'],
                        shadeIntensity: 1,
                        type: 'horizontal',
                        opacityFrom: 1,
                        opacityTo: 1,
                        stops: [0, 100, 100, 100]
                    },
                },
                markers: {
                    size: 4,
                    opacity: 0.9,
                    colors: ["#ffbc00"],
                    strokeColor: "#fff",
                    strokeWidth: 2,
                    style: 'inverted', // full, hollow, inverted
                    hover: {
                        size: 7,
                    }
                },
                tooltip: {
                    theme: "dark",      
                },
            }
            
            chartAnalysis = new CustomApexChart("#apex_line1", "line");
            chartAnalysis.setOptions(options);
            chartAnalysis.setOptions({
                'title' : 'RACE CHART',
                'height' : 396,
                'xAxisTitle' : 'LAP / TIME',
                'yAxisTitle' : 'TIME',
            });
            chartAnalysis.render();
        }

        if (!getCheckedChartDrivers().length) return;

        var xAxis = [];
        var series = {};
        var data = {};

        if($("#select-xAxis").length) xAxisTitle = $("#select-xAxis").val();
        if($("#select-yAxis").length) yAxisTitle = $("#select-yAxis").val();
        chartAnalysis.setOptions({
            'xAxisTitle' : xAxisTitle,
            'yAxisTitle' : yAxisTitle,
        });

        if(flagYAXISOnly){
            // after get datas from database score
            xAxis = gameLaps;
            if(checkedChartDrivers.length && gameData.length){
                let tempDriver;
                checkedChartDrivers.forEach(driverId => {
                    tempDriver = gameData.find(driver => parseInt(driver.number) === parseInt(driverId));
                    if(tempDriver){
                        series[tempDriver.number] = tempDriver.name;
                        data[tempDriver.number] = tempDriver.data;
                    }
                });
            }
            console.log(gameData, data, xAxis, series);

            if(chartAnalysis && chartAnalysis.isRendered){
                // update
                chartAnalysis.setSeries(series);
                chartAnalysis.setXAxis(xAxis);
                chartAnalysis.setData(data);

                if(sliderAnalysis){
                    sliderAnalysis.update({
                        from: chartAnalysis.yValueMin,
                        to: chartAnalysis.yValueMax
                    });
                }
            }
        }
        else {
            getDatasAnalysis(function(){
                // after get datas from database score
                xAxis = gameLaps;
                if(checkedChartDrivers.length && gameData.length){
                    let tempDriver;
                    checkedChartDrivers.forEach(driverId => {
                        tempDriver = gameData.find(driver => parseInt(driver.number) === parseInt(driverId));
                        if(tempDriver){
                            series[tempDriver.number] = tempDriver.name;
                            data[tempDriver.number] = tempDriver.data;
                        }
                    });
                }
                console.log(gameData, data, xAxis, series);
        
                if(chartAnalysis && chartAnalysis.isRendered){
                    // update
                    chartAnalysis.setSeries(series);
                    chartAnalysis.setXAxis(xAxis);
                    chartAnalysis.setData(data);

                    if(sliderAnalysis){
                        sliderAnalysis.update({
                            from: chartAnalysis.yValueMin,
                            to: chartAnalysis.yValueMax
                        });
                    }
                }
            });
        }
    }


    var chartAnalysisGAP = null;

    var sliderAnalysisGAP = null;

    var mainAnalysisGAP = null;

    // analysis_gap page - chart
    function chartRenderAnalysisGAP(){
        if(!document.getElementById("apex_line3")) return ;

        if (!chartAnalysisGAP) {
            // create chart analysis_gap
            chartAnalysisGAP = new CustomApexChart("#apex_line3", "line");
            chartAnalysisGAP.setOptions({
                'title' : 'ANALYSIS by GAP CHART',
                'height' : 396,
                'xAxisTitle' : 'LAP',
                'yAxisTitle' : 'GAP',
            });
            chartAnalysisGAP.render();
        }

        if (!getCheckedChartDrivers().length) return;

        if($("#select-main-driver").length) mainAnalysisGAP = $("#select-main-driver").val();
        if (!mainAnalysisGAP) return;

        var currentSeries = {};

        checkedChartDrivers.forEach(driverId => {
            // chart series name
            currentSeries[driverId] = "";
            if ($("#customCheck"+driverId).length) currentSeries[driverId] = $("#customCheck"+driverId).attr('data-title');
        });

        getDatasCharts(function() {
            if (!gameChartsLapsValues || !gameChartsLapsValues.length) return;
            console.log("[chartRenderAnalysisGAP] after getDatasCharts", gameChartsLapsValues, currentSeries, gameChartsData, gameChartsSector1Data, gameChartsSector2Data, gameChartsSector3Data, gameChartAnalysisGAPData, mainAnalysisGAP);

            if (chartAnalysisGAP) {
                chartAnalysisGAP.setSeries(currentSeries);
                chartAnalysisGAP.setXAxis(gameChartsLapsValues);

                // compare main to others
                let mainDriver = savedLocalStorageData[mainAnalysisGAP];
                if (mainDriver) {
                    let dataArrayNo = getArraysFromDriver(mainDriver);
                    if (dataArrayNo) {
                        mainDriverGameChartAnalysisGAPData = dataArrayNo['ChartAnalysisGAP'];
                    }
                }
                for (let no in gameChartAnalysisGAPData) {
                    gameChartAnalysisGAPData[no] = gameChartAnalysisGAPData[no].map((v, i) => v - mainDriverGameChartAnalysisGAPData[i]);
                }

                chartAnalysisGAP.setData(gameChartAnalysisGAPData, true);

                if(sliderAnalysisGAP){
                    let tempMin = CustomApexChart.calcYAxisMin(chartAnalysisGAP.yValueMin);
                    let tempMax = CustomApexChart.calcYAxisMax(chartAnalysisGAP.yValueMax);
                    sliderAnalysisGAP.update({
                        from: tempMin,
                        to: tempMax,
                        min: tempMin,
                        max: tempMax
                    });
                }
            }
        }, true);

    }


    var gameChartsLapsValues;
    var gameChartsLapsValuesMax = 0;
    var gameChartsData;
    var gameChartsSector1Data;
    var gameChartsSector2Data;
    var gameChartsSector3Data;
    var gameChartAnalysisGAPData;

    // get arrays from driver of savedLocalStorageData
    function getArraysFromDriver(driver) {
        if (!checkedChartDrivers || !checkedChartDrivers.length) return null;
        
        gameChartsDataNo = new Array(checkedChartDrivers.length);
        gameChartsSector1DataNo = new Array(checkedChartDrivers.length);
        gameChartsSector2DataNo = new Array(checkedChartDrivers.length);
        gameChartsSector3DataNo = new Array(checkedChartDrivers.length);
        gameChartAnalysisGAPDataNo = new Array(checkedChartDrivers.length);

        gameChartsDataNo.fill(0);
        gameChartsSector1DataNo.fill(0);
        gameChartsSector2DataNo.fill(0);
        gameChartsSector3DataNo.fill(0);
        gameChartAnalysisGAPDataNo.fill(0);

        let avarage = 0, avarage1 = 0, avarage2 = 0, avarage3 = 0, count = 0, count1 = 0, count2 = 0, count3 = 0;
        for (let lap in driver) {
            lap = parseInt(lap);
            let pos = gameChartsLapsValues.indexOf(lap);
            // console.log("[getDatasCharts]", gameChartsLapsValues, lap, pos);
            if (pos >= 0) {
                let temp = parseFloat(driver[lap][0]);
                if (temp > 0) {
                    gameChartsDataNo[pos] = temp;
                    // avarage += temp;
                    // count ++;
                }
                temp = parseFloat(driver[lap][1]);
                if (temp > 0) {
                    gameChartsSector1DataNo[pos] = temp;
                    // avarage1 += temp;
                    // count1 ++;
                }
                temp = parseFloat(driver[lap][2]);
                if (temp > 0) {
                    gameChartsSector2DataNo[pos] = temp;
                    // avarage2 += temp;
                    // count2 ++;
                }
                temp = parseFloat(driver[lap][3]);
                if (temp > 0) {
                    gameChartsSector3DataNo[pos] = temp;
                    // avarage3 += temp;
                    // count3 ++;
                }
                temp = parseFloat(driver[lap][4]);
                if (temp > 0) {
                    gameChartAnalysisGAPDataNo[pos] = temp;
                }
            }
        }
        // avarage = (count > 0) ? (avarage / count) : 0;
        // avarage1 = (count1 > 0) ? (avarage1 / count1) : 0;
        // avarage2 = (count2 > 0) ? (avarage2 / count2) : 0;
        // avarage3 = (count3 > 0) ? (avarage3 / count3) : 0;
        // console.log("[getDatasCharts]", avarage, avarage1, avarage2, avarage3);

        // gameChartsDataNo = gameChartsDataNo.map(g => ((g > 0) ? g : avarage));
        // gameChartsSector1DataNo = gameChartsSector1DataNo.map(g => ((g > 0) ? g : avarage1));
        // gameChartsSector2DataNo = gameChartsSector2DataNo.map(g => ((g > 0) ? g : avarage2));
        // gameChartsSector3DataNo = gameChartsSector3DataNo.map(g => ((g > 0) ? g : avarage3));

        return {
            Charts: gameChartsDataNo,
            ChartsSector1: gameChartsSector1DataNo,
            ChartsSector2: gameChartsSector2DataNo,
            ChartsSector3: gameChartsSector3DataNo,
            ChartAnalysisGAP: gameChartAnalysisGAPDataNo,
        }
    }

    // get datas for charts from localstorage
    function getDatasCharts(callback, force=false) {
        if (!savedLocalStorageData || !CustomApexChart.IS_ENABLE || !checkedChartDrivers) return;

        gameChartsLapsValues = [];
        gameChartsData = {};
        gameChartsSector1Data = {};
        gameChartsSector2Data = {};
        gameChartsSector3Data = {};
        gameChartAnalysisGAPData = {};
        let tempMax = 0;

        for (let no in savedLocalStorageData) {
            let driver = savedLocalStorageData[no];

            for (let lap in driver) {
                lap = parseInt(lap);
                if (isNaN(lap)) continue;
                if (gameChartsLapsValues.indexOf(lap) < 0) gameChartsLapsValues.push(lap);
                if (tempMax < lap) tempMax = lap;
            }
        }
        gameChartsLapsValues.sort(function(a, b) {
          return a - b;
        });
        // console.log("[getDatasCharts] gameChartsLapsValues", gameChartsLapsValues, tempMax);
        if (tempMax <= gameChartsLapsValuesMax && !checkedChartDriversChanged && !force) return;
        gameChartsLapsValuesMax = tempMax;
        checkedChartDriversChanged = false;

        for (let no in savedLocalStorageData) {
            let driver = savedLocalStorageData[no];

            let findDriver = checkedChartDrivers.find(d => d == no);
            // console.log("[getDatasCharts]", findDriver);
            if (findDriver) {
                let dataArrayNo = getArraysFromDriver(driver);
                if (dataArrayNo) {
                    gameChartsData[no] = dataArrayNo['Charts'];
                    gameChartsSector1Data[no] = dataArrayNo['ChartsSector1'];
                    gameChartsSector2Data[no] = dataArrayNo['ChartsSector2'];
                    gameChartsSector3Data[no] = dataArrayNo['ChartsSector3'];
                    gameChartAnalysisGAPData[no] = dataArrayNo['ChartAnalysisGAP'];
                }
                // console.log("[getDatasCharts]", gameChartsData, gameChartsSector1Data, gameChartsSector2Data, gameChartsSector3Data, gameChartAnalysisGAPData);
            }
            // console.log("[getDatasCharts]", gameChartsData, gameChartsSector1Data, gameChartsSector2Data, gameChartsSector3Data);
        }

        callback();
    }

    var chartLaptime = null, 
        chartSector1 = null, 
        chartSector2 = null, 
        chartSector3 = null;
    var isCheckedDrivers = false;

    var sliderLaptime = null,
        sliderSector1 = null,
        sliderSector2 = null,
        sliderSector3 = null;

    // chart page - charts render
    function chartRenderCharts() {
        if(!document.getElementById("apex_line2_chart")) return ;

        // create charts for chart page
        if (!chartLaptime) {
            chartLaptime = new CustomApexChart("#apex_line2_chart", "line");
            chartLaptime.setOptions({
                'title' : 'laptime(seconds)/lap',
                'height' : 396,
                'xAxisTitle' : 'LAP',
                'yAxisTitle' : 'Laptime',
            });
            chartLaptime.render();
        }
        if (!chartSector1) {
            chartSector1 = new CustomApexChart("#basic-column-sector1", "bar");
            chartSector1.setOptions({
                'height' : 385,
                'xAxisTitle' : 'LAP',
                'yAxisTitle' : 'sector1',
            });
            chartSector1.render();
        }
        if (!chartSector2) {
            chartSector2 = new CustomApexChart("#basic-column-sector2", "bar");
            chartSector2.setOptions({
                'height' : 385,
                'xAxisTitle' : 'LAP',
                'yAxisTitle' : 'sector2',
            });
            chartSector2.render();
        }
        if (!chartSector3) {
            chartSector3 = new CustomApexChart("#basic-column-sector3", "bar");
            chartSector3.setOptions({
                'height' : 385,
                'xAxisTitle' : 'LAP',
                'yAxisTitle' : 'sector3',
            });
            chartSector3.render();
        }

        chartPageCheckDrivers();

        getCheckedChartDrivers();

        var currentSeries = {};

        checkedChartDrivers.forEach(driverId => {
            // chart series name
            currentSeries[driverId] = "";
            if ($("#customCheck"+driverId).length) currentSeries[driverId] = $("#customCheck"+driverId).attr('data-title');

            // chart series data
        });

        getDatasCharts(function() {
            if (!gameChartsLapsValues || !gameChartsLapsValues.length) return;
            console.log("[chartRenderCharts] after getDatasCharts", gameChartsLapsValues, currentSeries, gameChartsData, gameChartsSector1Data, gameChartsSector2Data, gameChartsSector3Data);

            if (chartLaptime) {
                chartLaptime.setSeries(currentSeries);
                chartLaptime.setXAxis(gameChartsLapsValues);
                chartLaptime.setData(gameChartsData);

                if(sliderLaptime){
                    let tempMin = CustomApexChart.calcYAxisMin(chartLaptime.yValueMin);
                    let tempMax = CustomApexChart.calcYAxisMax(chartLaptime.yValueMax);
                    sliderLaptime.update({
                        from: tempMin,
                        to: tempMax,
                        min: tempMin,
                        max: tempMax
                    });
                }
            }
            if (chartSector1) {
                chartSector1.setSeries(currentSeries);
                chartSector1.setXAxis(gameChartsLapsValues);
                chartSector1.setData(gameChartsSector1Data);

                if(sliderSector1){
                    let tempMin = CustomApexChart.calcYAxisMin(chartSector1.yValueMin);
                    let tempMax = CustomApexChart.calcYAxisMax(chartSector1.yValueMax);
                    sliderSector1.update({
                        from: tempMin,
                        to: tempMax,
                        min: tempMin,
                        max: tempMax
                    });
                }
            }
            if (chartSector2) {
                chartSector2.setSeries(currentSeries);
                chartSector2.setXAxis(gameChartsLapsValues);
                chartSector2.setData(gameChartsSector1Data);

                if(sliderSector2){
                    let tempMin = CustomApexChart.calcYAxisMin(chartSector2.yValueMin);
                    let tempMax = CustomApexChart.calcYAxisMax(chartSector2.yValueMax);
                    sliderSector2.update({
                        from: tempMin,
                        to: tempMax,
                        min: tempMin,
                        max: tempMax
                    });
                }
            }
            if (chartSector3) {
                chartSector3.setSeries(currentSeries);
                chartSector3.setXAxis(gameChartsLapsValues);
                chartSector3.setData(gameChartsSector1Data);

                if(sliderSector3){
                    let tempMin = CustomApexChart.calcYAxisMin(chartSector3.yValueMin);
                    let tempMax = CustomApexChart.calcYAxisMax(chartSector3.yValueMax);
                    sliderSector3.update({
                        from: tempMin,
                        to: tempMax,
                        min: tempMin,
                        max: tempMax
                    });
                }
            }
        });

    }

    // chart page - check drivers
    function chartPageCheckDrivers() {
        if(!$(".check-chart-driver").length || isCheckedDrivers) return ;

        if (sortedRealDrivers.length) {
            $(".check-chart-driver").each(function() {
                let elmNumber = $(this).attr('id').replace('customCheck', '');
                if (sortedRealDrivers.find(function (d) { return d && d.number == elmNumber; })) {
                    $(this).removeAttr('disabled');
                }
            });
            isCheckedDrivers = true;
        }
    }


    $(document).ready(function(){

        // rangeslider init - powerange
        // with Callback function
        if(document.querySelector('#slider-player .js-callback')){
            var clbk = document.querySelector('#slider-player .js-callback');
            var initClbk = new Powerange(clbk, {
                callback: function(){
                    timer.reset(clbk.value);
                }
                , decimal       : false
                , disable       : false
                , disableOpacity: 0.5
                , hideRange     : false
                , klass         : ''
                , min           : 0
                , max           : 100
                , start         : null
                , step          : null
                , vertical      : false 
            });
            timer.setSliderBar(initClbk);
        }

        // replay button
        $(document).on("click", "#btn-replay", function(){
            if(flagCurrent) {
                // var modal = new Custombox.modal({
                //     content: {
                //         target: $(this).attr("data-target"),
                //         effect: $(this).attr("data-animation")
                //     }
                // });
                // modal.open();
            }
            else warningAlert("Would you stop replaying this session?", function(){
                location.reload();
            });
        });

        // from modal
        function selectSessionFromModal(game_id){
            // modal hide
            // $(".custombox-overlay, .custombox-content").hide();
            // $(".custombox-lock").removeClass("custombox-lock");

            // select old session
            if(game_id > 0){
                if(pageTitle && pageTitle.indexOf("ANALYSIS") >= 0){
                    // analysis page
                    // chart render
                    lastGameId = game_id;
                    logLastGameId = 0;
                    chartRenderAnalysis();
                }
                else{
                    // others page
                    // get timelines from ajax
                    ajax_send_force({session_id : game_id}, 'select_session', 'select session', function(result){
                        try{
                            // timelines = JSON.parse(result);
                            timelines = result;
                            if(!timelines || timelines.length < 1){
                                warningAlert("There is no saving data.");
                            }
                            else{
                                // flag current show -> old replay
                                flagCurrent = false;
        
                                clearDrivers();
        
                                const tempTimeKeys = Object.keys(timelines);
                                timeStart = tempTimeKeys[0];
                                timeEnd = tempTimeKeys[tempTimeKeys.length-1];
        
                                // replay controller show
                                $("#slider-player .range-min").text(timeStart);
                                $("#slider-player .range-max").text(timeEnd);
                                $("#slider-player #btn-play").addClass("active");
                                timer.play();
                            }
                        }
                        catch(ex){
                        }
                    });
                }
            }
        }

        // replay play button
        $(document).on("click", "#slider-player #btn-play", function(){
            $("#slider-player button").removeClass("active");
            $(this).addClass("active");
            timer.play();
        });

        // replay pause button
        $(document).on("click", "#slider-player #btn-pause", function(){
            $("#slider-player button").removeClass("active");
            $(this).addClass("active");
            timer.pause();
        });

        // replay stop button
        $(document).on("click", "#slider-player #btn-stop", function(){
            $("#slider-player button").removeClass("active");
            $(this).addClass("active");
            timer.stop();
        });

        // modal close
        $(document).on("click", "#custom-modal .close, #custom-modal .select-session", function(){
            selectSessionFromModal($(this).attr("data-session")?parseInt($(this).attr("data-session")):0);
        });
        
        
        // virtual driver add
        $(document).on("click", "#btn-add, #btn-add-2", function(){
            let selectRealDrivers = $("#select-driver").val();
            const gapToAdd = $("#input-gap-add").val();
            const virtualDriverName = $("#input-drvier-name").val();
            const selectColor = $("#select-color").val();
            let virtualDriverNames = [];

            if(!selectRealDrivers || !selectRealDrivers.length){
                selectRealDrivers = getSelectedRealDriverKeys();
            }

            if (!selectRealDrivers.length) {
                warningAlert("You must select real drivers to follow.");
            }
            else if(!gapToAdd){
                warningAlert("You must input the value of GAP to add.");
            }
            else if(!virtualDriverName){
                warningAlert("You must input a virtual driver name.");
            }
            else if(!selectColor){
                warningAlert("You must select a color of virtual driver.");
            }
            else{
                // add virtaul driver
                selectRealDriverIds = selectRealDrivers.map(s => parseInt(s));

                if ($(this).attr('id') == "btn-add") {
                    if (selectRealDriverIds.length == 1) virtualDriverNames = [virtualDriverName];
                    else virtualDriverNames = selectRealDriverIds.map((s, i) => virtualDriverName + i);
                }
                else {
                    let realNames = selectRealDrivers.map(s => "_"+s.replace(/[0-9]+ : /i, "").trim()+"");
                    if (selectRealDriverIds.length == 1) virtualDriverNames = [virtualDriverName + realNames[0]];
                    else virtualDriverNames = selectRealDriverIds.map((s, i) => virtualDriverName + realNames[i]);
                }

                addVirtualDriver(selectRealDriverIds, parseFloat(gapToAdd), virtualDriverNames, selectColor);
            }
        });

        // virtual driver add fast
        $(document).on("click", "#btn-add-fast", function(){
            // add virtual driver randomly
            // const gapAddConstant = 1;
            // $("#input-gap-add").val(gapAddConstant).change();
            const gapToAdd = $("#input-gap-add").val();
            let selectRealDrivers = $("#select-driver").val();
            let virtualDriverNames = [];

            if(!selectRealDrivers || !selectRealDrivers.length){
                selectRealDrivers = getSelectedRealDriverKeys();
            }

            if (!selectRealDrivers.length) {
                warningAlert("You must select real drivers to follow.");
            }
            else if(!gapToAdd){
                warningAlert("You must input the value of GAP to add.");
            }
            else{
                selectRealDriverIds = selectRealDrivers.map(s => parseInt(s));
                virtualDriverNames = selectRealDrivers.map(s => "GHOST_"+s.replace(/[0-9]+ : /i, "").trim()+"");

                randomIndex = Math.floor(Math.random() * ($("#select-color option").length - 1)) + 1;
                let selectColor = $("#select-color option:eq("+randomIndex+")").val();
                $("#select-color").val(selectColor);

                $("#input-drvier-name").val(virtualDriverNames[0]).change();

                addVirtualDriver(selectRealDriverIds, parseFloat(gapToAdd), virtualDriverNames, selectColor);
            }
        });

        // virtual driver delete
        $(document).on("click", "#btn-delete", function(){
            let vals = [];
            let names = [];
            $("#table-board input[type=checkbox]").each(function(index){
                if(this.checked){
                    vals.push($(this).attr("id").substring(11));
                    names.push($(this).attr("data-driver-name"));
                }
            });
            if(vals.length > 0) passingAlert("Would you delete " + vals.join(", ") + " ?", names);
            else warningAlert("You must select the virtual drivers before delete them.");
        });


        // responsive table handle
        // button table focus
        $(document).on("click", "#btn-table-focus", function(){
            $(this).toggleClass('btn-primary');
            $(".table-responsive").find("table").toggleClass('focus-on');
            // $(".table-responsive tr").removeClass('unfocused');
            // $(".table-responsive tr").removeClass('focused');
        });

        // responsive table tr
        $(document).on("click", ".table-responsive#main-panel-table  tr", function(){
            if(!$("#btn-table-focus").hasClass("btn-primary")){
                $(".table-responsive").find("table").addClass('focus-on');
                // $(".table-responsive tr").removeClass('unfocused');
                // $(".table-responsive tr").removeClass('focused');
                // $(".table-responsive tr").addClass('unfocused');

                let indexKey = $(this).attr("id").replace("tr-", "");
                if(sortedRealDrivers && sortedRealDrivers.length > 0 && indexKey != ""){
                    let focusDriver = sortedRealDrivers.find(driver => driver.indexKey === indexKey);
                    if(focusDriver){
                        if($(this).hasClass('focused')){
                            focusDriver.hasFocusClass = false;
                        }
                        else{
                            focusDriver.hasFocusClass = true;
                            // $(this).addClass('focused');
                        }
                        timingScope.sortedRealDrivers = sortedRealDrivers;
                        timingScope.$apply();
                    }
                }
            }
            else{
                $(".table-responsive").find("table").removeClass('focus-on');
            }
        });

        // button display all
        $(document).on("click", "#btn-display-all", function(){
            $(".checkbox-row input").each(function(){
                $(this).prop('checked', true);
                $(this).trigger('change');
            });
            refreshResopnsiveTable();
        });

        // li checkbox row
        $(document).on("click", ".checkbox-row input", function(){
            refreshResopnsiveTable();
        });


        // refresh responsive table
        function refreshResopnsiveTable(){
            let tempChecked;
            let tempClass;
            $(".checkbox-row input").each(function(){
                tempChecked = $(this).val();
                tempClass = $(".table-responsive").find("th[value="+tempChecked+"]").attr("class");
                if($(this).is(':checked')){
                    $(".table-responsive ."+tempClass).show();
                }
                else{
                    $(".table-responsive ."+tempClass).hide();
                }
            });
        }


        // compare drivers
        $(document).on("change", ".compare-card select", function(){
            let val = $(this).val();
            let key = $(this).attr("data-select-driver");
            selectedCompareDrivers[key] = timingScope.linesSorted[val];
            refreshCompareDrivers();
        });

        refreshCompareDrivers();


        // charts - analysis, analysis_gap, chart
        // select xAxis
        $(document).on("change", "#select-xAxis, #select-yAxis, #select-main-driver, .check-chart-driver", function(){
            // analysis page refresh
            chartRenderAnalysis();
            // analysis_gap page refresh
            chartRenderAnalysisGAP();
            // chart page refresh
            chartRenderCharts();
        });

        // chart refresh
        $(document).on("click", "#btn-analysis-gragh-refresh", function(){
            logLastGameId = 0;
            chartRenderAnalysis();
        });

        // analysis page - charts render
        chartRenderAnalysis();

        // analysis_gap page - charts render
        chartRenderAnalysisGAP();

        // chart page - charts render
        chartRenderCharts();
        
        if($("#range_03").length){
            // create
            $("#range_03").ionRangeSlider({
                type: "double",
                grid: true,
                min: 0,
                max: 1000,
                from: 0,
                to: 1000,
                prefix: "",
                onChange: function(value){
                    yAxisMax = value.to;
                    yAxisMin = value.from;
                    chartRenderAnalysis(true);
                }
            });

            // Saving it's instance to var
            sliderAnalysis = $("#range_03").data("ionRangeSlider");
        }

        if($("#range_analysis_gap").length){
            // create
            $("#range_analysis_gap").ionRangeSlider({
                type: "double",
                grid: true,
                min: 0,
                max: 1000,
                from: 0,
                to: 1000,
                prefix: "",
                step: 0.1,
                onChange: function(value){
                    yAxisMax = value.to;
                    yAxisMin = value.from;
                    if (chartAnalysisGAP) {
                        chartAnalysisGAP.setOptions({
                            'yAxisMin': yAxisMin,
                            'yAxisMax': yAxisMax,
                        });
                    }
                }
            });

            // Saving it's instance to var
            sliderAnalysisGAP = $("#range_analysis_gap").data("ionRangeSlider");
        }

        if($("#range_chart_laptime").length){
            // create
            $("#range_chart_laptime").ionRangeSlider({
                type: "double",
                grid: true,
                min: 0,
                max: 2000,
                from: 0,
                to: 2000,
                prefix: "",
                onChange: function(value){
                    yAxisMax = value.to;
                    yAxisMin = value.from;
                    if (chartLaptime) {
                        chartLaptime.setOptions({
                            'yAxisMin': yAxisMin,
                            'yAxisMax': yAxisMax,
                        });
                    }
                }
            });

            // Saving it's instance to var
            sliderLaptime = $("#range_chart_laptime").data("ionRangeSlider");
        }

        if($("#range_chart_sector1").length){
            // create
            $("#range_chart_sector1").ionRangeSlider({
                type: "double",
                grid: true,
                min: 0,
                max: 1000,
                from: 0,
                to: 1000,
                prefix: "",
                onChange: function(value){
                    yAxisMax = value.to;
                    yAxisMin = value.from;
                    if (chartSector1) {
                        chartSector1.setOptions({
                            'yAxisMin': yAxisMin,
                            'yAxisMax': yAxisMax,
                        });
                    }
                }
            });

            // Saving it's instance to var
            sliderSector1 = $("#range_chart_sector1").data("ionRangeSlider");
        }

        if($("#range_chart_sector2").length){
            // create
            $("#range_chart_sector2").ionRangeSlider({
                type: "double",
                grid: true,
                min: 0,
                max: 1000,
                from: 0,
                to: 1000,
                prefix: "",
                onChange: function(value){
                    yAxisMax = value.to;
                    yAxisMin = value.from;
                    if (chartSector2) {
                        chartSector2.setOptions({
                            'yAxisMin': yAxisMin,
                            'yAxisMax': yAxisMax,
                        });
                    }
                }
            });

            // Saving it's instance to var
            sliderSector2 = $("#range_chart_sector2").data("ionRangeSlider");
        }

        if($("#range_chart_sector3").length){
            // create
            $("#range_chart_sector3").ionRangeSlider({
                type: "double",
                grid: true,
                min: 0,
                max: 1000,
                from: 0,
                to: 1000,
                prefix: "",
                onChange: function(value){
                    yAxisMax = value.to;
                    yAxisMin = value.from;
                    if (chartSector3) {
                        chartSector3.setOptions({
                            'yAxisMin': yAxisMin,
                            'yAxisMax': yAxisMax,
                        });
                    }
                }
            });

            // Saving it's instance to var
            sliderSector3 = $("#range_chart_sector3").data("ionRangeSlider");
        }


        // redraw circle map each sec
        if ($('#app svg.radar').length) {
            GDriver.IS_ENABLE = true;
            if (typeof defaultLaptime !== "undefined") GDriver.TOTAL_LAPTIME = defaultLaptime;
            setInterval(GDriver.drawMap, GDriver.STEP_REDRAW);
        }


    });

});
