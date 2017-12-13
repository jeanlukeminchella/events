var express = require('express');
var app = express();
var fs = require("fs");
var http = require("http");
var path = require ("path");
var crypto = require("crypto");

var passwd = "concertina";
var users={};
var sessions={};

var admin = {"username":"admin","password":"concertina"};
addUser(admin);

var events={"events":[]};
var venues={};



function addUser(user)
{
	try
	{

		users[user.username]=user.password;
		console.log("user list now goes:"+JSON.stringify(users));
	}
	catch(err)
	{
		console.log(err);
		return (err);
	}
}



var server = http.createServer(function (req, resp) {
    
	fs.readFile("index.html", function (error, pgResp) {
	resp.writeHead(200);
	resp.write(pgResp);
	resp.end();
	});
    
}); 

console.log('Server running at http://127.0.0.1:8080/');


app.get('/', function(req, resp){
	console.log("homepage sent" )
	resp.sendFile(path.join(__dirname + "/index.html"))
});

app.get('/login/validate', function(req, resp){
	
	console.log(req.ip);
	resp.json({"isValid":isAuthorised(req.ip,req.query.auth_token)});
});

/* app.get('/login', function(req, resp){
	console.log("login sent" )
	resp.sendFile(path.join(__dirname + "/login.html"))
}); */

app.post('/login/authenticate', function(req, resp){
	var username = req.query.username;
	console.log("authenticating user with username:"+username+" password:"+req.query.password )
	console.log("their password is secretly:" + users[username]);
	if (users[username]==req.query.password)
	{
		var id = crypto.randomBytes(20).toString('hex');
		resp.json({auth_token:id});
		authoriseToken(id,req.ip);
	}
	else
	{
		resp.json({"error": "not authorised, wrong password"});
	}
	
});

function authoriseToken(auth_token, ipAddress)
{
	sessions[ipAddress]=[auth_token,new Date()];
}


app.get('/admin', function(req, resp){
	if(isAuthorised(req.ip,req.query.auth_token))
	{
		console.log("admin sent" )
		resp.sendFile(path.join(__dirname + "/admin.html"))
	}
	else
	{
		resp.sendFile(path.join(__dirname + "/index.html"))
	}
});

app.get('/venues', function(req, res){
	res.setHeader('content-type', 'application/json');
	res.send(venues);
	// res.sendFile(path.join(__dirname+"venues.json"))
	});

app.get('/events/search', function(req, res){
	
	
	
	var content = events;
	var eventsArray = content.events;
	
	
	var paramDate = req.query.date;
	console.log(typeof(paramDate))
	var weHaveADate=false;
	if (!(typeof(paramDate)=="undefined" || paramDate=="" ||  paramDate=="undefined"))
	{
		weHaveADate=true;
	}
	console.log("weHaveADate is " + weHaveADate);
	
	var paramDateAfter = req.query.dateAfter;
	var paramDateBefore = req.query.dateBefore;
	var weHaveADateRange=false;
	if (!(typeof(paramDateBefore)=="undefined" || paramDateBefore=="" || paramDateBefore=="undefined"))
	{
		var beforeMsc = Date.parse(paramDateBefore);
		paramDateBefore = new Date(beforeMsc);
		paramDateBefore = new Date(beforeMsc);
		weHaveADateRange=true;
		if (typeof(paramDateAfter)=="undefined" || paramDateAfter=="")
		{
			paramDateAfter=new Date();
			console.log("no from date set so paramDateAfter="+paramDateAfter);
		}
		else
		{
			var afterMsc = Date.parse(paramDateAfter);
			paramDateAfter= new Date(afterMsc);
		}
	}
	
	
	
	var paramTitle = req.query.title;
	var weHaveATitle=false;
	if (!(typeof(paramTitle)=="undefined" || paramTitle=="" || paramTitle=="undefined"))
	{
		weHaveATitle=true;
	}
	
	console.log("just had a search for date:"+paramDate+" and title:"+paramTitle+" and date range "+paramDateAfter+" "+paramDateBefore);
	console.log ("so weHaveATitle="+weHaveATitle+" and weHaveADateRange="+weHaveADateRange+" and weHaveADate="+weHaveADate);
	
	
	// BEGIN THE SEARCH	
	
	var validEvents = [];
	
	//console.log("all the events are:"+JSON.stringify(content.events))
	
	for (var i = 0; i < content.events.length; i++) 
	{
		var evnt = content.events[i];
		console.log("current evvmt title :"+JSON.stringify(evnt.title))
		var eventMatchesSearch = true;
		if (weHaveATitle)
		{
			
			if(!evnt.title.includes(paramTitle))
			{
				eventMatchesSearch = false;
				console.log("	sorry wrong title");
			}
		}
		console.log("weHaveADate && eventMatchesSearch is "+(weHaveADate && eventMatchesSearch));
		if (weHaveADate && eventMatchesSearch)
		{
			console.log("	testing date");
			if(evnt.date!=paramDate)
			{
				console.log("	sorry wrong date");
				eventMatchesSearch = false;
			}
		}
		
		if (weHaveADateRange && eventMatchesSearch)
		{
			var evntMilisec = Date.parse(evnt.date);
			var eventDate = new Date(evntMilisec);
			console.log("	testing date range");
			console.log("			paramDateBefore="+paramDateBefore);
			console.log("			evnt.date="+eventDate);
			console.log("			paramDateAfter="+paramDateAfter);

			if(!(eventDate<paramDateBefore && eventDate>paramDateAfter))
			{
				console.log("	sorry not in date range, evnt.date<paramDateBefore s "+(eventDate<paramDateBefore)+ "and evnt.date>paramDateAfter is "+(eventDate>paramDateAfter));
				eventMatchesSearch = false;
			}
		}
		
		if(eventMatchesSearch)
		{
			console.log("we found a great event:"+JSON.stringify(evnt.title)+"at venue"+evnt.venue_id);
			console.log("formatting event, finding  venues.venues[evnt.venue_id] = " + JSON.stringify(venues.venues[evnt.venue_id]));
			var eventVenue = venues.venues[evnt.venue_id];
			if(typeof(eventVenue)!="undefined")
			{
				eventVenue.venue_id=evnt.venue_id;
			}
			
			finalEvent =
			{
				"event_id":evnt.event_id,
				"title":evnt.title,
				"blurb":evnt.blurb,
				"date":evnt.date,
				"url":evnt.url,
				"venue":eventVenue
				
				
			}
			validEvents.push(evnt);
		}
	}
	
	
	var eventsListAsJSON = 
	{
		"events":validEvents
	}
	
	console.log("sending "+JSON.stringify(eventsListAsJSON))
	
	res.set('content-type', 'application/json');
	res.json(eventsListAsJSON);
	
});

app.get('/events/get/:event_id', function(req, res){
	
	
	var content = events;
	var eventsList = content.events;
	res.setHeader('content-type', 'application/json');
	for (evnt in eventsList)
	{
		if (evnt.event_id == event_id)
		{
			res.json(evnt);
		}
	}
	res.json({"error": "no such event"});
});

app.post('/venues/add', function(req, res){

	console.log("adding venue with query: "+JSON.stringify(req.query));
	
	var content = venues;
	
	var howManyVenues=Object.keys(content.venues).length;
	var newVenueAtrributeName = "v_"+(howManyVenues+1).toString()
	
	var venue = 
	{
		"name":req.query.name,
		"postcode":req.query.postcode,
		"town":req.query.town,
		"url":req.query.url,
		"icon":req.query.icon
	};
	
	if(!isAuthorised(req.ip,req.query.auth_token))
	{
		res.status(400);
		res.json({"error": "not authorised, wrong token"});
	}
	else
	{
	if (typeof(venue.name) == "undefined")
	{
		res.status(400);
		res.json({"error": "not authorised, you must enter name"});
	}
	else
	{
		content.venues[newVenueAtrributeName]=venue;
		console.log(content);
		venues=content;
		res.json({'status' : 'ok'});
	}
	}
});

app.post('/events/add', function(req, res){

	
	var content = events;
	var eventsArray = content.events;
	
	if(!isAuthorised(req.ip,req.query.auth_token))
	{
		res.status(400);
		res.json({"error": "not authorised, wrong token"});
	}
	else
	{

	
		var evnt = 
		{
			"event_id":req.query.event_id,
			"title":req.query.title,
			"venue_id":req.query.venue_id,
			"date":req.query.date,
			"url":req.query.url,
			"blurb":req.query.blurb
		};
		
		
		if (typeof(evnt.title) == "undefined"||typeof(evnt.venue_id) == "undefined"||typeof(evnt.event_id) == "undefined"||typeof(evnt.date) == "undefined")
		{
		res.status(400);
		res.json({"error": "not authorised, you must enter name,event_id,title,venue_id"});
		}
		else
		{
			console.log("adding event"+JSON.stringify(evnt));
			eventsArray.push(evnt);
			content.events=eventsArray;
			console.log("eventss array is now: "+JSON.stringify(eventsArray));
			events=content;
			res.json({'status' : 'ok'});
		}
	}


});

app.post('/resetVenues',function(req, res){
	resetVenues();
	res.json({'status' : 'ok'});
});

app.post('/resetEvents',function(req, res){
	resetEvents();
	res.json({'status' : 'ok'});
});

function resetEvents()
{
	console.log("resetting Events")
	events = {"events":[{"event_id":"e_1","title":"Jazz guitar off","venue_id":"v_1","date":"2018-4-4","url":"http://www.guitar.com/","blurb":"it'll be jazz great"}]};
	venues = {"venues":{"v_1":{"name":"City Hall","postcode":"ne297th","town":"Newcastle","url":"www.cityhall.com","icon":"http://media.ticketmaster.co.uk/tm/en-gb/dbimages/2477v.jpg"},"v_2":{"name":"Metro Radio","postcode":"ne297gj","town":"Newcastle","url":"www.metro.com","icon":"https://eurohostels.s3.amazonaws.com/uploads/2016/03/Metro-Radio-Arena.jpg"}}};
	
}

function resetVenues()
{
	console.log("resetting venues")
	venues={"venues":{"v_1":{"name":"City Hall","postcode":"ne297th","town":"Newcastle","url":"www.cityhall.com","icon":"http://media.ticketmaster.co.uk/tm/en-gb/dbimages/2477v.jpg"},"v_2":{"name":"Metro Radio","postcode":"ne297gj","town":"Newcastle","url":"www.metro.com","icon":"https://eurohostels.s3.amazonaws.com/uploads/2016/03/Metro-Radio-Arena.jpg"}}};

}

function isAuthorised(ip,auth_token)
{
	console.log("just had an authorisation method call on ip, auth:"+ip+auth_token);
	console.log("sessions currently:"+JSON.stringify(sessions));
	var lastLoginFromIP = sessions[ip]
	console.log("last login from ip "+ip+" was: "+JSON.stringify(lastLoginFromIP));
	var currentDate = new Date;
	if (typeof(lastLoginFromIP)=="undefined")
	{
		console.log("ip ("+ip+") not registered")
		return false
	}
	else
	{
		if (lastLoginFromIP[0]!=auth_token)
		{
			console.log("wrong auth_token")
			return false
		}
		else
		{
			if((currentDate-lastLoginFromIP[1])>7200000)
			{
				console.log("older than 2 hours")
				return false
			}
			else
			{
				
				return true;
			}
		}
		
	}
}

resetEvents();
resetVenues();
var port = process.env.PORT || 8080;
app.listen(port,function()
{
	console.log("app running"+port);
});





