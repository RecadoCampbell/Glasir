/**
 * NOTE: This file is deprecated.
 * 
 */



/**
 * Gets a file tree from the server.
 * Appends each folder and file as a UL/LI element
 */
function getFileList(directory,ul){
	$ul = $(ul);
	if($ul.children('ul').length > 0){
		//hide children
		$ul.children('ul').remove();
	}else{
		//show children
		$.ajax({
				type:"GET",
				url:"phpFileTree/php_file_tree.php",
				data:{
						"dir":directory,
						"extensions":['mp3','ogg','MP3'],
						"output":"json"
					},
				success:function(data){
					console.log(data);
					$ul.children('ul').remove();
					$ul.append(data);
				}
		});
	}
}

/*
 * elem is the anchor of the play button
 */
function playbuttonClick(elem){
	if($(elem).parent().parent().hasClass("playing")) return; //do nothing for current playing element
	
	//remove the play button from other playing songs
	$(".playing td a:first-child img").attr('src','images/playbutton.png');
	//add play button to this song
	$(elem).children(':first-child').attr('src','images/playbutton_playing.png');
	//remove playing class from other songs
	$(elem).parent().parent().siblings().removeClass('playing');
	//add playing class to this song
	$(elem).parent().parent().addClass('playing');
	//play this song
	song = $(elem).parent().parent().children('td:eq(1)').html();
	artist = $(elem).parent().parent().children('td:eq(2)').html();
	$("#player-new #currentsong").html((song != ""?song:"")+(artist != ""?" - "+artist:""))
	play($(elem).parent().parent().children('td:last-child').html());
	
	//set the last playing song in case the page is refreshed.
	setCookie("playing",$(elem).parent().parent().children('td:last-child').html(),365);
}

/** 
 * Gets the playlist for a user. 
 * The user must be logged in and the session created.
 */
function getPlaylist(){
	$.ajax({
		type:"GET",
		url:"playlist.php",
		dataType:"json",
		success:function(data){
			if(data['return']==0){
				$("#right").empty();
				$playlist = $("<table class=\"playlist\"></table>");
				headers = "<tr>";
				headers += "<th></th><th>Title</th><th>Artist</th><th>Album</th><th>Genre</th><th>Year</th><th>Bitrate</th><th>Duration</th><th style=\"display:none;\">Duration</th>";
				headers += "</tr>";
				$playlist.append(headers);
				for(i in data['result']){
					html = "<tr>";
					html += "<td class=\"playlist-buttons\">" +
								"<a href=\"javascript:void(0);\" onclick=\"playtoggle(this);playbuttonClick(this);\">" + //playbuttonClick(this);
									"<img src=\"images/playbutton.png\" title=\"Play\" alt=\"Play\" />" +
								"</a>" +
								"<a href=\"javascript:void(0);\" onclick=\"remove($(this).parent().parent().children('td:last-child').html());$(this).parent().parent().remove();\">" +
									"<img src=\"images/removebutton.png\" title=\"Remove\" alt=\"Remove\" />" +
								"</a>"
							"</td>";
					html += "<td>"+data['result'][i]['Title']+"</td>";
					html += "<td>"+data['result'][i]['Artist']+"</td>";
					html += "<td>"+data['result'][i]['Album']+"</td>";
					html += "<td>"+data['result'][i]['Genre']+"</td>";
					html += "<td>"+data['result'][i]['Year']+"</td>";
					html += "<td>"+(Math.ceil(parseInt(data['result'][i]['Bitrate'])/1000))+"kbps</td>";
					secs = ((parseInt(data['result'][i]['Duration'])%60) < 10? "0"+(parseInt(data['result'][i]['Duration'])%60):(parseInt(data['result'][i]['Duration'])%60));
					html += "<td>"+(Math.floor(parseInt(data['result'][i]['Duration'])/60))+":"+secs+"</td>";
					html += "<td style=\"display:none;\">"+data['result'][i]['Filename']+"</td>";
					html += "</tr>";
					$playlist.append(html);
				}
				$("#right").append($playlist);
				
				//play the first song in the list. The song file is in the last column (hidden)
				if(getCookie("playing") != null && getCookie("playing") != "null"){
					//set the last playing song in case the page is refreshed.
					var lastSong = getCookie("playing");
					elem = $(".playlist tr td:last-child").filter(function(index){
						return $(this).html() === lastSong;
					});
					if(elem.size() > 0){
						playbuttonClick($(".playlist tr td:last-child").filter(function(index){
							return $(this).html() === lastSong;
						}).siblings(":first").children("a:first-child"));
					}else{
						playbuttonClick($(".playlist tr:eq(1) td:first-child a:first-child"));
					}	
				}else{
					playbuttonClick($(".playlist tr:eq(1) td:first-child a:first-child"));
				}
			}else{
				$("#right").empty().append(data['error']);
			}
		},
		error:function(xhr,ajaxOptions,thrownError){
			alert(thrownError);
	   }
	});
}

function play(file){
	//TODO: do something when a null file is passed.
	if(file == null){
		alert("null file, try the next one");
		return;
	}
	
	var audio = document.createElement('audio');
	var alerted = 0;
	var duration = 0;
	var checkPlayInterval;
	var previousCurrentTime = 0;
	audio.setAttribute("id","audioPlayer");
	audio.setAttribute("controls","true");
	audio.autobuffer = true;
	audio.preload = "auto";
	if((audio.buffered != undefined) && (audio.buffered.length != 0)){
		$("#buffering").removeClass("hidden");
		$(audio).bind('progress', function(){
			var loaded = parseInt(((audio.buffered.end(0) / duration) * 100), 10);
			$("#buffering").width(loaded+"%");
		});	
	}else{
		$("#buffering").addClass("hidden");
	}
	audio.addEventListener( "canplay", function(){
			$("#playtoggle").addClass("playing"); 
			$("#pausetoggle").addClass("playing");
			
			$(audio).audivid("play");
			checkPlayInterval = setInterval(function(){
				if(audio.currentTime >= previousCurrentTime + 1 //this was an old problem, the current time in Chrome would continue past the duration 
					|| audio.currentTime == 9223372013568 //sometimes Chrome ends at this magic number. gah!
					|| audio.currentTime > duration - 1){  //firefox doesn't always end at or near the duration. gah!
					$(audio).audivid("pause");
					clearInterval(checkPlayInterval);
					
					nextSong = getNextSong();
					//alert(nextSong.file);
					$nextSongElement = nextSong.element;
					
					playbuttonClick($($nextSongElement).children(".playlist-buttons").children("a:first-child"));
				}else{ //debug check
					//$("#player_hold").html(previousCurrentTime+" - "+audio.currentTime+" - "+duration);
				}
			},1000);
	}, true);
	audio.addEventListener( "timeupdate", function(){ 
			previousCurrentTime = this.currentTime;
			$loading = $("#loading"); 
			$loading.width(($loading.parent().parent().width()*(previousCurrentTime/duration))+"px");
			$("#positionbutton").css("margin-left",($loading.width()-5)+"px");
			$("#player_hold").html(previousCurrentTime+" - "+this.currentTime+" - "+duration);
		}, true);
	
	//Chrome still has issues with ogg.
	if(audio.canPlayType("audio/mp3")){
		audio.src = "mediaservice.php?type=mp3&file="+escape(file);
	}else if($.browser.mozilla && audio.canPlayType("audio/ogg")){
		audio.src = "mediaservice.php?type=ogg&file="+escape(file);
		$.ajax({
			   type: "GET",
			   url: audio.src,
			   dataType: "script"
			 });
	}else{ //Can anything else just use mp3?
		audio.src = "mediaservice.php?type=mp3&file="+escape(file);
	}
	
	$("#player").html(audio);
	audio.load();
	$.ajax({
	   type: "GET",
	   url: audio.src.split("?")[0],
	   data: "duration=true&file="+escape(file),
	   success: function(msg){
		   info = $.parseJSON(msg);
		   
		   duration = info['duration'];
		   
	   },
	   error:function(xhr,ajaxOptions,thrownError){
			alert(thrownError);
	   }
	 });
}

//remove a file from the playlist
function remove(file){
	$.ajax({
	   type: "POST",
	   url: "playlist.php",
	   data: {
		   action:'remove',
		   filename:file
	   },
	   dataType:"json",
	   success: function(msg){
		   //stop it from playing if it is?
	   },
	   error:function(xhr,ajaxOptions,thrownError){
			alert(thrownError);
	   }
	 });
}

//adds a file to the end of the playlist.
function queue(file){
	$.ajax({
		type:"POST",
		url:"playlist.php",
		data:{action:'queue',
			filename:file},
		dataType:"json",
		success:function(data){
			//add result to end of list
			getPlaylist();
		},
		error:function(xhr,ajaxOptions,thrownError){
			alert(xhr.status+" - "+thrownError);
		}
	});
}

//figures out which song is playing based on its background color
//then increments to the next one if the playmode is default
//or a random one if playMode is 'random'
function getNextSong(){
	playMode = 'default';
	if(getCookie("playMode") != null){
		playMode = getCookie("playMode");
	}
	
	if(playMode == 'default'){
		next = $(".ui-layout-center .playing").next();
		if(next.length == 0) next = $(".ui-layout-center .playing").siblings().first().next(); //first is a header
		return {file:next.children('td:last-child').html(),
				element:next
			};
	}else if(playMode == 'random'){
		siblings = $(".ui-layout-center .playing").siblings();
		rand = Math.floor(Math.random() * siblings.length);
		if(rand == 0) rand = 1;
		next = $(".ui-layout-center .playing").siblings().eq(rand);
		
		if(next.length == 0) next = $(".ui-layout-center .playing").siblings().first().next(); //first is a header
		return {file:next.children('td:last-child').html(),
				element:next
			};
	}
}

/**
 * Gets the sibling above the currently playing one.
 */
function getPreviousSong(){
	//get current playing song.
	playingElement = $(".ui-layout-center .playing");
	if(playingElement.length > 0){
		if(playingElement.parent().children().index(playingElement) > 1){
			previous = $(".ui-layout-center .playing").prev();
			return {file:previous.children('td:last-child').html(),
					element:previous
				};
		}else{
			//return the first one.
			previous = $(".ui-layout-center .playing").siblings().first().next(); //first is a header
			return {file:previous.children('td:last-child').html(),
				element:previous
			};
		}
	}else{ //return the first one.
		previous = $(".ui-layout-center table tr:eq(1)") //first row is a header
		return {file:previous.children('td:last-child').html(),
			element:previous
		};
	}
}

function playtoggle(parent){
	if($("#audioPlayer").audivid("isplaying") == 1){ //pause
		$("#playtoggle").removeClass("playing");
		$("#pausetoggle").removeClass("playing");
		$(".playing td a:first-child img").attr('src','images/playbutton.png');
	}else{  //play
		$("#playtoggle").addClass("playing");
		$("#pausetoggle").addClass("playing");
		$(".playing td a:first-child img").attr('src','images/playbutton_playing.png');
	}
	$("#audioPlayer").audivid("playpause");
	
}
// Note: Do not name this next()!
function playnext(){
	$("#audioPlayer").audivid("pause");
	
	nextSong = getNextSong();
	$nextSongElement = nextSong.element;
	
	playbuttonClick($($nextSongElement).children(".playlist-buttons").children("a:first-child"));
}
/**
 * Gets the previous song to play. 
 * Will not work in random mode!
 */
function playprevious(){
	if(getCookie("playMode") == null || getCookie("playMode") == 'default'){
		$("#audioPlayer").audivid("pause");
		
		previousSong = getPreviousSong();
		$previousSongElement = previousSong.element;
		
		playbuttonClick($($previousSongElement).children(".playlist-buttons").children("a:first-child"));
	}
}


function cyclePlayMode(){
	if($("#playmode").hasClass("random")){
		setCookie("playMode","default",365);
		$("#playmode").removeClass("random").addClass("default");
		$("#previousbutton img").removeClass("random");
		
	}else{
		setCookie("playMode","random",365);
		$("#playmode").removeClass("default").addClass("random");
		$("#previousbutton img").addClass("random");
	}
}
