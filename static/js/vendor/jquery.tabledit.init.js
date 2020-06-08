/**
 * Theme: Frogetor - Responsive Bootstrap 4 Admin Dashboard
 * Author: Mannatthemes
 * Tabledit Js
 */


// admin

// circuit table
if($('#table-circuit').length > 0){
  $('#table-circuit').Tabledit({
    url: '/user/admin?ajax_save=circuits',
    hideIdentifier: true,
    columns: {
      identifier: [0, 'id'],                    
      editable: [
        [1, 'title'], 
        [2, 'country'], 
        [3, 'date'], 
        [4, 'length'], 
        [5, 'year', '{"2019": "2019", "2020": "2020"}']
      ]
    }
  });
}

// add new circuit
$(document).on('click', '#btn-add-new-circuit', function () {
  $lastTr = $("#table-circuit tr[data-id=table-circuit-last-tr]");
  if($lastTr.is(":hidden")){
    $lastTr.removeAttr("hidden");
    $(this).text("Refresh Table");
  }
  else{
    location.reload();
  }
});


// session table
if($('#table-session').length > 0){
  $('#table-session').Tabledit({
    url: '/user/admin?ajax_save=sessions',
    hideIdentifier: true,
    columns: {
      identifier: [0, 'id'],                    
      editable: [
        [1, 'title'], 
        [2, 'circuit_id', allSessionsByCircuts], 
        [3, 'user_id'], 
        [4, 'championship', '{"f2": "Formula 2", "f3": "Formula 3", "fe": "Formula E"}'], 
        [5, 'start_time'],
        [6, 'laps'],
        [7, 'type', '{"PRACTICE": "PRACTICE", "QUALIFYING": "QUALIFYING", "RACE1": "RACE1", "RACE2": "RACE2"}'],
        [8, 'status']
      ]
    },
    onDraw: function() {
      // Select all inputs of second column and apply datepicker each of them
      $('table tr td[data-type="datetime"] input').each(function() {
        $(this).attr("type", "datetime-local");
      });
    }
  });  
}

// add new session
$(document).on('click', '#btn-add-new-session', function () {
  $lastTr = $("#table-session tr[data-id=table-session-last-tr]");
  if($lastTr.is(":hidden")){
    $lastTr.removeAttr("hidden");
    $(this).text("Refresh Table");
  }
  else{
    location.reload();
  }
});


// save session
$(document).on('click', '.btn-session-save', function () {
  let championship = $(this).attr("data-championship");
  let game_id = $(this).attr("data-gameId");
  var myWindow = window.open("index.php?page=save&game_id="+game_id+"&championship="+championship, "SaveWindow", "width=500,height=600,menubar=no,status=no,top=100,left=100");
  myWindow.onbeforeunload = function(){
    // close handler
    $.ajax({
      url: '/user/admin?ajax_save=record',
      type: 'POST',
      async: true,
      data: {
          data: {},
          method: 'record_finish',
          gameid: game_id
      },
      success: function(result){
          // console.log("ajax result:", result);
      }
    });
  }
});


// user table
if($('#table-user').length > 0){
  $('#table-user').Tabledit({
    url: '/user/manage?ajax_save=user',
    hideIdentifier: false,
    columns: {
      identifier: [0, 'id'],                    
      editable: [
        [1, 'user_id'], 
        [2, 'password'], 
        [3, 'championship', '{"f2": "Formula 2", "f3": "Formula 3", "fe": "Formula E"}'], 
        [4, 'privilege', '{"ALL": "ALL", "SOME": "SOME", "LESS": "LESS", "POOR" : "POOR"}'], 
        [5, 'is_admin', '{"1": "YES", "0": "NO"}'],
        [6, 'team_id', allTeamsByUsers],
      ]
    },
  });
}

// add new user
$(document).on('click', '#btn-add-new-user', function () {  
  $lastTr = $("#table-user tr[data-id=table-user-last-tr]");
  if($lastTr.is(":hidden")){
    $lastTr.removeAttr("hidden");
    $(this).text("Refresh Table");
  }
  else{
    location.reload();
  }
});