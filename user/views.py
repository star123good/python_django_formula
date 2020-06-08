from django.shortcuts import render
from django.http import HttpResponse
from django.template import RequestContext
from django.shortcuts import redirect
from django.core.exceptions import ObjectDoesNotExist
import json
# from django.views.generic.base import View
from datetime import datetime, timedelta
from django.utils import timezone

from . import models

class UserView():
    # Create your views here.
    # get initialized parameters
    def getInitParams(request):
        try:
            user_id = request.session.get('user_id', 0)
            user = models.User.objects.get(id=user_id)
            all_users_temp = models.User.objects.all()
            all_users = []
            for u in all_users_temp:
                u.is_admin = 'YES' if u.is_admin == 1 else 'NO'
                u.championship = 'Formula 2' if u.championship == 'f2' else 'Formula 3'  if u.championship == 'f3' else 'Formula E'
                all_users.append(u)

            all_circuits = models.Circuit.objects.all()
            circuits_titles = '{' + ','.join([('#' + str(entry.id) + '#:#' + entry.title + '#') for entry in all_circuits]) + '}'

            all_teams = models.Team.objects.values('id', 'team_name')
            teams_titles = '{' + ','.join([('#' + str(entry['id']) + '#:#' + entry['team_name'] + '#') for entry in all_teams]) + '}'
            user_name = user.user_id
            privilege = user.privilege
            team = user.team
            championship = user.championship
            formula_logo = 'logo-'+ championship +'.png'
            team_logo = team.team_logo

            current_time = timezone.now()
            current_time_before_two_hours = current_time - timedelta(hours=2)
            current_session = models.Session.objects.filter(championship=championship, start_time__gte=current_time_before_two_hours).order_by('start_time')
            if len(current_session) > 0:
                current_session_id = current_session[0].id
            else:
                current_session_id = 0

            all_sessions_temp = models.Session.objects.all()
            all_sessions = []
            flag_temp_find = False
            for s in all_sessions_temp:
                s.championship_id = s.championship
                s.championship = 'Formula 2' if s.championship == 'f2' else 'Formula 3'  if s.championship == 'f3' else 'Formula E'
                if current_session_id > 0 and current_session_id == s.id:
                    s.flag_save_enable = True
                elif s.championship_id != championship and s.start_time >= current_time and not flag_temp_find :
                    s.flag_save_enable = True
                    flag_temp_find = True
                else:
                    s.flag_save_enable = False
                s.start_time = s.start_time.strftime("%Y-%m-%dT%H:%M")
                all_sessions.append(s)

            return {
                'championship' : championship, 
                'game_id' : current_session_id, 
                'user_id' : user_name,
                'privilege' : privilege,
                'formula_logo' : formula_logo,
                'team_logo' : team_logo,
                'all_users' : all_users,
                'teams_titles' : teams_titles,
                'all_circuits' : all_circuits,
                'circuits_titles' : circuits_titles,
                'all_sessions' : all_sessions,
                'user_real_id' : user.id,
            }
        except ObjectDoesNotExist:
            pass
        return {}

    # login page & login post
    def login(request):
        teams = models.Team.objects.all()
        if request.method == "POST":
            parameters = request.POST
            try:
                team = models.Team.objects.get(id=parameters.get('team', 0))
                user = models.User.objects.get(user_id=parameters.get('userid', ''), password=parameters.get('userpassword', ''), championship=parameters.get('championship', ''), team=team)
            except ObjectDoesNotExist:
                user = None
            if user == None:
                return render(request, 'pages/pages-login.html', {'teams' : teams})
            else :
                request.session['user_id'] = user.id
                return redirect('/')
        else :
            return render(request, 'pages/pages-login.html', {'teams' : teams})

    # register page & register post
    def register(request):
        teams = models.Team.objects.all()
        if request.method == "POST":
            parameters = request.POST
            try:
                team = models.Team.objects.get(id=parameters.get('team', 0))
                if parameters.get('userpassword', '') == parameters.get('confirmpassword', ''):
                    user = models.User(user_id=parameters.get('userid', ''), password=parameters.get('userpassword', ''), championship=parameters.get('championship', 'f2'), privilege=parameters.get('privilege', 'ALL'), team=team)
                    user.save()
                    request.session['user_id'] = user.id
                    return redirect('/')
            except ObjectDoesNotExist:
                pass
            return render(request, 'pages/pages-register.html', {'teams' : teams})
        else :
            return render(request, 'pages/pages-register.html', {'teams' : teams})
    
    # logout
    def logout(request):
        try:
            del request.session['user_id']
        except KeyError:
            pass
        return redirect('/')

    # admin page & admin post
    def admin(request):
        if request.method == "POST":
            parameters = request.POST
            result = 'fail'
            try:
                if request.GET['ajax_save'] == 'circuits':
                    circuit_id = (parameters.get('id', 0))
                    try:
                        circuit_id = int(circuit_id)
                    except ValueError:
                        circuit_id = 0
                    
                    action = parameters.get('action', '')
                    if action == 'edit':
                        if circuit_id > 0:
                            circuit = models.Circuit.objects.get(id=circuit_id)
                        else :
                            circuit = models.Circuit()
                        circuit.title = parameters.get('title', '')
                        circuit.country = parameters.get('country', '')
                        circuit.date = parameters.get('date', '')
                        circuit.length = parameters.get('length', '')
                        circuit.year = parameters.get('year', '')
                        circuit.save()
                    elif action == 'delete':
                        if circuit_id > 0:
                            circuit = models.Circuit.objects.get(id=circuit_id)
                            circuit.delete()

                elif request.GET['ajax_save'] == 'sessions':
                    session_id = (parameters.get('id', 0))
                    try:
                        session_id = int(session_id)
                    except ValueError:
                        session_id = 0
                    
                    action = parameters.get('action', '')
                    if action == 'edit':
                        if session_id > 0:
                            session = models.Session.objects.get(id=session_id)
                        else :
                            session = models.Session()
                        session.title = parameters.get('title', '')
                        session.championship = parameters.get('championship', '')
                        session.start_time = parameters.get('start_time', '')
                        session.laps = parameters.get('laps', '')
                        try:
                            session.laps = int(session.laps)
                        except ValueError:
                            session.laps = 0
                        session.session_type = parameters.get('type', '')
                        session.status = parameters.get('status', '')
                        session.circuit = models.Circuit.objects.get(id=int(parameters.get('circuit_id', 0)))
                        session.user = models.User.objects.get(id=int(parameters.get('user_id', 0)))
                        session.save()
                    elif action == 'delete':
                        if session_id > 0:
                            session = models.Session.objects.get(id=session_id)
                            session.delete()

                elif request.GET['ajax_save'] == 'record':
                    # record page
                    return render(request, 'pages/admin.html', UserView.getInitParams(request))

                    result = 'success'
            except ObjectDoesNotExist:
                pass

            return HttpResponse(json.dumps({'result' : result}), content_type="application/json")
        else :
            return render(request, 'pages/admin.html', UserView.getInitParams(request))

    # user manage page
    def manage(request):
        if request.method == "POST":
            parameters = request.POST
            result = 'fail'
            try:
                if request.GET['ajax_save'] == 'user':
                    user_id = (parameters.get('id', 0))
                    try:
                        user_id = int(user_id)
                    except ValueError:
                        user_id = 0
                    
                    action = parameters.get('action', '')
                    if action == 'edit':
                        if user_id > 0:
                            user = models.User.objects.get(id=user_id)
                        else :
                            user = models.User()
                        user.user_id = parameters.get('user_id', '')
                        user.password = parameters.get('password', '')
                        user.championship = parameters.get('championship', '')
                        user.privilege = parameters.get('privilege', '')
                        user.is_admin = int(parameters.get('is_admin', 0))
                        user.team = models.Team.objects.get(id=int(parameters.get('team_id', 0)))
                        user.save()
                    elif action == 'delete':
                        if user_id > 0:
                            user = models.User.objects.get(id=user_id)
                            user.delete()

                    result = 'success'
            except ObjectDoesNotExist:
                pass

            return HttpResponse(json.dumps({'result' : result}), content_type="application/json")
        else :
            return render(request, 'pages/manage.html', UserView.getInitParams(request))
    
    # 404 error page
    def error_404_view(request, exception):
        return render_to_response(request, 'pages/page-404.html')

    # 500 error page
    def error_500_view(request):
        return render(request, 'pages/page-500.html')