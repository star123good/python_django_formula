/*!
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
    var lt = $.connection.Streaming;
    var ltc = $.connection.Commentary;
    var reconnectCounter = 0;
    var tryingToReconnect = false;
    var pageTitle = $('title').text();
    var color = {
        white: '#FFFFFF',
        red: '#FF0000',
        green: '#00FF00', // green   : '#008000',
        blue: '#0000FF',
        yellow: '#FFFF00',
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

    function init() {

        lt.server.joinFeeds(series, ['data', 'weather', 'status', 'time', 'commentary','racedetails']);
        lt.server.getData2(series, ['data', 'statsfeed', 'weatherfeed', 'sessionfeed', 'trackfeed', 'commentaryfeed', 'timefeed', 'racedetailsfeed']).done(processData);

        reconnectCounter++;
        $('.connection-status').removeClass('reconnecting reconnected disconnected');
        $('.connection-status').addClass('connected');
        $('title').text(pageTitle);
    }

    function processData(data) {
        var st;
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
        if (data.racedetailsfeed) {
            var csf = data.racedetailsfeed;
            lt.client.racedetailsfeed(csf[0], csf[1]);
        }
        timingrootScope.$apply();
    }

    function zeroPad(num, places) {
        var zero = places - num.toString().length + 1;
        return Array(+(zero > 0 && zero)).join('0') + num;
    }

    if (!lt || !lt.client) return;

    lt.client.comment = function (msg) {
        // commentary.push({ 'text': msg }); 
        commentary.unshift({ 'text': msg }); // Show latest commentary on top
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
    }

    lt.client.timefeed = function (sentTime, freerun, value) {
        try {
            timefeed.epoc = sentTime;
            timefeed.running = freerun;
            timefeed.remaining = parseTime(value);
            $('#time').text(value);
            sentTime = parseF1Date(sentTime);
            if (serverTime < sentTime) serverTime = sentTime;
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
            }
        }
        catch (ex) { console.error('outer', ex.message); }
    };

    lt.client.trackfeed = function (sentTime, value) {
        try {
            if (!FeedStatus.trackTime || FeedStatus.trackTime < sentTime) {
                FeedStatus.trackTime = sentTime;
                FeedStatus.track = value.Value;
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
                var seriesName = "";
                if (feed.Series == "F2") {
                    seriesName = "Formula 2 ";
                }
                if (feed.Series == "F3") {
                    seriesName = "Formula 3 ";
                }
                timingScope.heading = feed.Session == "Race" ? seriesName + "Race" : seriesName + feed.Session + " Session";
                            
                if (feed.Session == 'Race')
                    timingScope.feed.Session = 'Race';
                else
                    timingScope.feed.Session = 'GPQualifying';
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
            if (timingScope) timingScope.$apply();
        }
        catch (ex) { console.error('outer', ex.message); }
    };

    var DriverStat = function (RacingNumber) {
        this.Driver = { 'RacingNumber': RacingNumber };
        this.BestSectors = [];
        this.BestSpeeds = [];
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

    var timingScope;
    var weatherScope;
    var timingrootScope;
    // var commnetaryScope; unused variable

    var timingApp = angular.module('timing', []);
    timingApp.controller('page', function ($scope) {
        timingrootScope = $scope.$root;
        $scope.feed = { 'Session': '' };
        timingScope = $scope;
        $scope.lines = driverLines;
        $scope.driverStatScope = driverStatScope;
        $scope.driverStatsSpeeds = driverStatsSpeeds;
        $scope.cutOffTime = cutOffTime;
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
        $.connection.hub.url = '/streaming';
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
});
