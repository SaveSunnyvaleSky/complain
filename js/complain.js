/*global
    $ console  Clipboard bootbox Handlebars
*/

//eslint    quotes=false

/*exported
    reset show_data_collector show_data_help show_help report_flight email_faa open_complaint_link
*/
var parseLog = function (l) {
    var re = /^([A-Z][a-z]+ [0-9]+, [\d]+:[\d]+:[\d]+) ([ \w]+) \(([A-Z]+):([A-Z]+) ([\w]+) ([\d]+k), ([\d]+ft)\)/g
    var re_excel = /^([^\t]+)\t([^\t]*)\t([^\t]*)\t([^\t]+)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]+)[\t]*([^\t]*)/g

    var r = re_excel.exec(l);
    if (r != null) {
        var a = {
            Time: r[1],
            FlightNo: r[4],
            From: r[6],
            To: r[7],
            Model: r[5],
            Speed: r[8],
            Airport: null,
            Altitude: r[9],
            City: r[2],
            Name: localStorage.Name,
            Address: localStorage.Address,
            Neighborhood: r[3],
        };
        if (r[10] != "") {
            a.Comment = "Comment: " + r[10] + "\n";
        }
        if (["PAO", "SJC", "SFO", "KSQL", "SQL"].indexOf(a.From) > -1) {
            a.Airport = a.From;
        } else if (["PAO", "SJC", "SFO", "KSQL", "SQL"].indexOf(a.To) > -1) {
            a.Airport = a.To;
        } else {
            a.Airport = a.FlightNo;
        }

        if (a.Speed.indexOf("kt") === -1) {
            a.Speed = a.Speed + " kts";
        }
        if (a.Altitude.indexOf("ft") === -1) {
            a.Altitude = a.Altitude + " ft";
        }
        return a;
    }

    r = re.exec(l);
    if (r != null) {
        a = {
            Time: r[1],
            FlightNo: r[2],
            From: r[3],
            To: r[4],
            Model: r[5],
            Speed: r[6],
            Airport: null,
            Altitude: r[7],
            Name: localStorage.Name,
            Address: localStorage.Address,
            Neighborhood: localStorage.Neighborhood
        };
        if (["PAO", "SJC", "SFO", "KSQL"].indexOf(a.From) > -1) {
            a.Airport = a.From;
        } else if (["PAO", "SJC", "SFO", "KSQL"].indexOf(a.To) > -1) {
            a.Airport = a.To;
        } else {
            a.Airport = a.FlightNo;
        }
        return a;
    }
    return null;
};
var save = function () {
    localStorage.template = $("#template").val();
    localStorage.template_version = $("#template_version").html();
};

var show_data_help = function () {
    bootbox.alert({
        title: "How to use this page",
        message: '<strong> Excel data format support</strong>' +
            '<img src="images/excel.jpg" class="img-responsive"></img>' +
            '<br><br>Input your data into excel, and then copy <strong>only the data in red box</strong> and paste here.<br>Here is one <a href="static/sample.csv">sample CSV file</a>' +
            "",
    });
};

var show_data_collector = function () {
    bootbox.confirm({
        title: "Enter flight information",
        message: $("#data-collector").html(),
        buttons: {
            confirm: {
                label: "Add To My Flight List",
                className: "btn-success"
            },
        },
        callback: function (c) {
            if (c) {
                // append to the list
                var v = $("#flightlist").val();
                var l = "\n";
                if (v[v.length - 1] == "\n") l = "";

                // Time (include Data as well)	City	Neighborhood	Flight No.	Model	From	To	Speed (kt)	Altitude (ft)	Comment on Noise Level
                var fd = [$("#kv-time").val(), localStorage.City,
                    $("#kv-neighborhood").val(),
                    $("#kv-flightno").val(),
                    $("#kv-model").val(),
                    $("#kv-from").val(),
                    $("#kv-to").val(),
                    $("#kv-speed").val(),
                    $("#kv-altitude").val(),
                    $("#kv-comment").val(),
                ];

                var ss = fd.slice(1).join("\t");
                if ($("#flightlist").val().indexOf(ss) == -1) {
                    $("#flightlist").val(v + l + fd.join("\t"));
                } else {
                    bootbox.alert("This flight " + $("#kv-flightno").val() + " added!")
                }

            }
        }
    });

};

var fr24_rule = {
    "flightno_f": /Map view \(default\)\n[^\n]+\n([\w]+)/m,
    "flightno_m": /Toggle navigation\nUTC[^\n]+\nSearch\n[^\n]+\n([\w]+)/m,
    "from": /FLIGHT STATUS[\s]*\n([\w]+)\n/m,
    "to": /FLIGHT STATUS[\s]*\n[\w]+\n[^\n]+\n([\w]+)\n/m,
    "model": /AIRCRAFT DETAILS[\s]*\nTYPE\(([\w]+)\)\n/m,
    "speed": /FLIGHT DETAILS[\s]+\nGROUND SPEED[\s]*\n([\d]+) kts\n/m,
    "altitude": /CALIBRATED ALTITUDE[\s]*\n([\d,]+) ft\n/m,
    "latitude": /LATITUDE[\s]*\n([\d\.-]+)[\s]*\n/m,
    "longitude": /LONGITUDE[\s]*\n([\d\.-]+)[\s]*\n/m,
    "airline_f": /Map view \(default\)\n[^\n]+\n[\w ]+[^\n]*\n([\w ]+)\nFLIGHT STATUS/m,
    "airline_m": /Toggle navigation\nUTC[^\n]+\nSearch\n[^\n]+\n[^\n]+\n([\w ]+)\nFLIGHT STATUS/m,
};

var fr24_find_data = function (s, term) {
    var re = fr24_rule[term]
    var t = re.exec(s);
    if (t != null) {
        if (t[1] == "FLIGHT") {
            return undefined;
        }
        return t[1];
    }
};

var report_flight = function () {
    var b = {
        "flightinfo": [],
    };
    var a = {};
    var info = $("#enter-flight-data").val();
    var now = new Date();

    b.flightinfo.push({
        "Key": "time",
        "Value": now.format("mm/dd/yy HH:MM"),
    });
    b.flightinfo.push({
        "Key": "neighborhood",
        "Value": localStorage.Neighborhood,
    });

    for (var k in fr24_rule) {
        var v = fr24_find_data(info, k);

        if ((k.indexOf("_m") > -1 || k.indexOf("_f") > -1) && typeof v !== "undefined") {
            b.flightinfo.push({
                "Key": k.slice(0, -2),
                "Value": v
            });
            a[k.slice(0, -2)] = v;
        } else if (!(k.indexOf("_m") > -1 || k.indexOf("_f") > -1)) {
            b.flightinfo.push({
                "Key": k,
                "Value": v
            });
            a[k] = v;
        }
    }
    b.flightinfo.push({
        "Key": "comment",
        "Value": ""
    });


    var tmplFlight = $("#tmpl-flight-detail").html();
    var theTemplate = Handlebars.compile(tmplFlight);
    var theCompiledHtml = theTemplate(b);

    $("#flight-details").html(theCompiledHtml);
};

var show_help = function () {
    var bx = bootbox.confirm({
        title: "How to use this page",
        message: '<strong> What is this page?</strong>' +
            '<p>This page help your parsing list of flight information, and generate email based on template.</p>' +
            '<strong> What need I do?</strong>' +
            '<ol>' +
            '<li>Update template with your accurate information. All information is stored locally in your browser. <b>Your name and address must be correct to get your report processed</b>' +
            '<div class="container"><form>' +
            '<div class="form-group row row-bottom-margin"><label class="col-sm-1 col-form-label col-form-label-sm"> Name: </label>' +
            '<div class="col-sm-20"><input class="form-control-sm col-sm-4" id="name-input"></input></div></div>' +
            '<div class="form-group row row-bottom-margin"><label class="col-sm-1 col-form-label col-form-label-sm"> Address: </label>' +
            '<div class="col-sm-20"><input class="form-control-sm col-sm-4" id="address-input"> </input></div></div>' +
            '<div class="form-group row row-bottom-margin"><label class="col-sm-1 col-form-label col-form-label-sm"> <small>Neighborhood:</small> </label>' +
            '<div class="col-sm-20"><input class="form-control-sm col-sm-4" id="neighborhood-input"> </input></div></div>' +
            '</form></div>' +
            '</li>' +
            '<li>Update template text for you, you should update text to reflect your option. The default template is a generic template.</li>' +
            '<li>Collect noisy flight in your location, and copy list of flights here. Please make sure no duplicate reports from different sites.</li>' +
            '</ol>' +
            '<br><strong>As user, you are solely reponsibile for the accuracy of the report. By clicking the Ok button you acknowledge you agree with this!</strong>' +
            '',
        callback: function (r) {
            if (r == false) {
                localStorage.help_showed = false;

                setTimeout(function() {
                    show_help();
                    bootbox.alert("You must enter all the information and accept the term of service!<br>All information is stored locally"); 
                }, 500);
            } else {
                if ($("#name-input").val() == "" || $("#address-input").val() == "" || $("#neighborhood-input").val() == "") {
                    localStorage.help_showed = false;
                    show_help();
                    bootbox.alert("You must enter name, address, and neighborhood<br>All information is stored locally");
                } else {
                    localStorage.Name = $("#name-input").val();
                    localStorage.Address = $("#address-input").val();
                    localStorage.Neighborhood = $("#neighborhood-input").val();
                    localStorage.help_showed = true;
                    $("#acked").html("Acknowledged Term: true");
                    load();
                }
            }
        }
    });
    bx.init(function () {
        // set value
        console.log("init help box");

        if (localStorage.Name) $("#name-input").val(localStorage.Name);
        if (localStorage.Address) $("#address-input").val(localStorage.Address);
        if (localStorage.Neighborhood) $("#neighborhood-input").val(localStorage.Neighborhood);
    });
};

var open_complaint_link = function (airport, index) {
    if (airport == "SJC") {
        window.open("https://goo.gl/wgCzmn", "_blank");
    } else if (airport == "SFO") {
        window.open("http://www.flysfo.com/community/noise-abatement/file-a-complaint", "_blank");
    } else if (airport == "KSQL" || airport == "SQL") {
        window.open("https://goo.gl/o7uYkF", "_blank");
    } else {
        bootbox.Alarm("Unknown Airport Code [" + airport + "], <br>Please file manually.");
    }
    $("#complaint_link_" + index).removeClass("btn-primary");
    $("#complaint_link_" + index).addClass("btn-default");
};


var email_faa = function (email, index, flight, airport) {
    var url = "";
    var target = "_blank"
    if (email == "gmail") {
        url = "https://mail.google.com/mail/?view=cm&fs=1&to=9-awa-noiseombudsman@faa.gov,jwilson@sjc.org&su=[" +
            airport + escape("] Airplane Noise Report from Sunnyvale (Flight No: " + flight + ")") + "&body=" + escape($("#email" + index).html());

        $("#gmail_link_" + index).removeClass("btn-primary");
        $("#gmail_link_" + index).addClass("btn-default");
    } else {
        url = "mailto:9-awa-noiseombudsman@faa.gov,jwilson@sjc.org?subject=[" +
            airport + escape("] Airplane Noise Report from Sunnyvale (Flight No: " + flight + ")") + "&body=" + escape($("#email" + index).html());
        target = "_self";
        $("#email_link_" + index).removeClass("btn-primary");
        $("#email_link_" + index).addClass("btn-default");
    }
    window.open(url, target);
};

var warnTemplateUpdate = false;
var defaultTemplate;

var load = function () {
    if (typeof defaultTemplate == "undefined") {
        defaultTemplate = $("#template").val();
    }
    if (localStorage.help_showed === "false" || typeof localStorage.Address == "undefined" || typeof localStorage.Name == "undefined") {
        show_help();
        return;
    } else {
        $("#acked").html(" | Acknowledged Term: <b>true</b>");
    }
    if (typeof localStorage.template_version != "undefined" && localStorage.template_version != $("#template_version").html()) {
        // reset template
        save();
        localStorage.help_showed = false;
        $("#acked").html(" | Acknowledged Term: <b>false</b>");
        show_help();
        return;
    }

    if (localStorage.template) {
        $("#template").val(localStorage.template);
        if (localStorage.template == defaultTemplate && warnTemplateUpdate == false) {
            bootbox.alert("Please update and <b><u>save</u></b> template!<br>All information stored locally.<br>We encourage you to <b>adapt the message</b> to reflect your opinion.<br>Please do not change text within <b><i>{{...}}</i></b>");
            warnTemplateUpdate = true;
            return;
        } else if (localStorage.template.indexOf("***") > -1) {
            bootbox.alert("Please update template and remove all <b>***</b> and <b><u>save</u></b> template first!");
            return;
        }
    } else {
        bootbox.alert("Please update and <b><u>save</u></b> template with your <b>name</b> and <b>address</b><br>All information stored locally.<br>We encourage you to <b>adapt the message</b> to reflect your opinion.<br>Please do not change text with <b><u>{{}}</u></b>");
        return;
    }

    var context = [];
    // parse data
    var list = $("#flightlist").val().split("\n");
    for (i = 0; i < list.length; i++) {
        var a = parseLog(list[i]);
        if (a != null) {
            context.push(a);
        }
    }
    // generate Email
    var theTemplateHeader = $("#template-header").html();
    var theTemplateScript = "{{#each this}} <br>" + theTemplateHeader + " <pre id='email{{ @index }}'>" + $("#template").val() + "</pre> </div></div><br> {{/each}}";
    var theTemplate = Handlebars.compile(theTemplateScript);

    // Define our data object
    var theCompiledHtml = theTemplate(context);
    $('.content-placeholder').html(theCompiledHtml);
};


var reset = function () {
    localStorage.template = defaultTemplate;
    $("#template").val(localStorage.template);
    load();
};

var init = function () {
    load();
    new Clipboard(".btn", {
        text: function (trigger) {
            return $(trigger.getAttribute("data-clipboard-target")).html();
        }
    });
};


// dateformat

var dateFormat = function () {
    var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d: d,
                dd: pad(d),
                ddd: dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                m: m + 1,
                mm: pad(m + 1),
                mmm: dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy: String(y).slice(2),
                yyyy: y,
                h: H % 12 || 12,
                hh: pad(H % 12 || 12),
                H: H,
                HH: pad(H),
                M: M,
                MM: pad(M),
                s: s,
                ss: pad(s),
                l: pad(L, 3),
                L: pad(L > 99 ? Math.round(L / 10) : L),
                t: H < 12 ? "a" : "p",
                tt: H < 12 ? "am" : "pm",
                T: H < 12 ? "A" : "P",
                TT: H < 12 ? "AM" : "PM",
                Z: utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

// Some common format strings
dateFormat.masks = {
    "default": "ddd mmm dd yyyy HH:MM:ss",
    shortDate: "m/d/yy",
    mediumDate: "mmm d, yyyy",
    longDate: "mmmm d, yyyy",
    fullDate: "dddd, mmmm d, yyyy",
    shortTime: "h:MM TT",
    mediumTime: "h:MM:ss TT",
    longTime: "h:MM:ss TT Z",
    isoDate: "yyyy-mm-dd",
    isoTime: "HH:MM:ss",
    isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};