from django.shortcuts import render, render_to_response
from django.http import HttpResponse
from django.template import RequestContext
from django.shortcuts import redirect
from django.core.exceptions import ObjectDoesNotExist
# from django.views.generic.base import View
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
import json

from user.models import User, Player, Session
from . import ajax, models



class Formula23View():
    # Create your views here.

    # get parameters about user
    def getUserParams(user_id):
        try:
            user = User.objects.get(id=user_id)
            user_name = user.user_id
            privilege = user.privilege
            team = user.team
            championship = user.championship
            formula_logo = 'logo-'+ championship +'.png'
            team_logo = team.team_logo
            is_adminer = True if user.is_admin else False
        except ObjectDoesNotExist:
            championship, user_name, privilege, formula_logo, team_logo = 0
        return championship, user_name, privilege, formula_logo, team_logo, is_adminer

    # get parameters about current session
    def getSessionParams(championship):
        current_session_id, current_session_title, last_session_id, current_session_laps, different_time, circuit_title, record_sessions_all = 0, 0, 0, 0, 0, 0, 0, 
        try:
            current_time = timezone.now()
            current_time_before_two_hours = current_time - timedelta(hours=2)
            sessions_all = Session.objects.all()
            record_sessions_all = Session.objects.filter(championship=championship, status='finished').order_by('start_time')
            current_session = Session.objects.filter(championship=championship, start_time__gte=current_time_before_two_hours).order_by('start_time')
            recorded_session = Session.objects.filter(championship=championship).filter(Q(status="finished") | Q(status="record")).order_by('-start_time')
            if len(current_session) > 0:
                current_session_laps = current_session[0].laps
                current_session_title = current_session[0].title
                current_session_id = current_session[0].id
                circuit_title = current_session[0].circuit.title
                different_time = (current_session[0].start_time - current_time - timedelta(hours=2)).total_seconds()
            else :
                current_session_laps = 0
            if len(recorded_session) > 0:
                last_session_id = recorded_session[0].id
            else :
                last_session_id = 0
        except ObjectDoesNotExist:
            pass
            # current_session_id, current_session_title, last_session_id, current_session_laps, different_time, circuit_title, record_sessions_all = None, None, None, None, None, None, None,
        return current_session_id, current_session_title, last_session_id, current_session_laps, different_time, circuit_title, record_sessions_all

    # get initialized parameters
    def getInitParams(request):
        try:
            user_id = request.session.get('user_id', 0)
            championship, user_name, privilege, formula_logo, team_logo, is_adminer = Formula23View.getUserParams(user_id)

            # players = Player.objects.all()
            current_session_id, current_session_title, last_session_id, current_session_laps, different_time, circuit_title, record_sessions_all = Formula23View.getSessionParams(championship)
            
            return {
                'championship' : championship, 
                'game_id' : current_session_id, 
                'last_game_id' : last_session_id, 
                'session_laps' : current_session_laps, 
                'current_session_title' : current_session_title, 
                'difftime' : different_time,
                'circuit_title' : circuit_title,
                'user_id' : user_name,
                'is_adminer' : is_adminer,
                'privilege' : privilege,
                'formula_logo' : formula_logo,
                'team_logo' : team_logo,
                'sessions_all' : record_sessions_all,
            }
        except ObjectDoesNotExist:
            pass
        return {}
        
    # index page
    def index(request):
        if request.session.get('user_id', False):
            return render(request, 'pages/home.html', Formula23View.getInitParams(request))
        else:
            return redirect('/user/login')
    
    # compare page
    def compare(request):
        if request.session.get('user_id', False):
            return render(request, 'pages/virtual.html')
        else:
            return redirect('/user/login')
    
    # virtual page
    def virtual(request):
        if request.session.get('user_id', False):
            return render(request, 'pages/virtual.html', Formula23View.getInitParams(request))
        else:
            return redirect('/user/login')

    # analysis page
    def analysis(request):
        if request.session.get('user_id', False):
            return render(request, 'pages/analysis.html', Formula23View.getInitParams(request))
        else:
            return redirect('/user/login')

    # save page
    def save(request):
        if request.session.get('user_id', False):
            return render(request, 'pages/save.html', Formula23View.getInitParams(request))
        else:
            return redirect('/user/login')

    # ajax process
    def ajax(request):

        # ajax controller
        ajax_controller = ajax.Formula23Ajax()

        result = {'result' : 'false'}

        if request.method == "POST":
            parameters = request.POST
            table = request.GET.get('table', '')

        try:
            if table != "":
                method = parameters.get('action', '')
                value = parameters

                if method == 'edit':
                    # edit & add
                    temp = {}
                    for key in value:
                        val = value[key]
                        if key != "action" : temp[key] = val
                    
                    value = temp
                    # exists_result = select_rows($pdo, $table, "`id` = ".$value['id'])
                    # keys = array_keys($value)
                    # values = array_values($value)
                    # if exists_result :
                    #     update_row($pdo, $table, $keys, $values, "`id` = ".$value['id'])
                    # else:
                    #     insert_row($pdo, $table, $keys, $values)

                elif method == 'delete':
                    # delete
                    # delete_rows($pdo, $table, "`id` = ".$value['id'])
                    pass

            else :
                current_game_id = int(parameters.get('gameid', 0))
                game_id = int(parameters.get('data[session_id]', 0))
                method = parameters.get('method', '')
                result = {'method' : method}
                datas = parameters.getlist('data[data][]')
                stats = parameters.getlist('data[stat][]')
                flag_reload = parameters.get('data[flag_reload]', False)
                flag_reload = True if flag_reload == 'true' else False

                if game_id > 0:
                    request.session['game_id'] = game_id
                elif int(request.session.get('game_id', 0)) > 0:
                    game_id = int(request.session.get('game_id', 0))

                # print(game_id, datas, stats, flag_reload)

                ajax_controller.set_gameId_championship(game_id)

                # select table & insert data
                if method == 'comment':
                    # table : commentary
                    pass
                elif method == 'timefeed':
                    # table : times
                    pass
                elif method == 'sessionfeed':
                    # table : status
                    pass
                elif method == 'trackfeed':
                    # table : status
                    pass
                elif method == 'weatherfeed':
                    # table : weather
                    pass
                elif method == 'datafeed':
                    # table : datas
                    ajax_controller.calc_socres()
                elif method == 'statsfeed':
                    # table : stats
                    pass
                elif method == 'record_finish':
                    # table : session
                    ajax.update_row(models.Session, ['status'], ['finished'], {'game':ajax_controller.session})
                elif method == 'calculate_socres':
                    # data feeds => scores
                    ajax_controller.calc_socres()
                elif method == 'analysis':
                    # table : score
                    result = ajax_controller.get_analysis()
                elif method == 'select_session':
                    # get all datas & stats feeds of selected game(session)
                    result = ajax_controller.getTimeline()
                elif method == 'get_data':
                    # get current datas & stats feeds via ids
                    result = {}
                    if len(datas) > 0 :
                        result = ajax_controller.get_current_time_data(datas, flag_reload)
                    if len(stats) > 0 :
                        result.update(ajax_controller.get_current_time_stat(stats, flag_reload))
                else :
                    # none
                    result = {'error' : 'There is no method.'}

        except ObjectDoesNotExist:
            pass

        # print(result)
        return HttpResponse(json.dumps(result), content_type="application/json")