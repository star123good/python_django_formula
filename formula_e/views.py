from django.shortcuts import render, render_to_response
from django.http import HttpResponse
from django.template import RequestContext
# from django.views.generic.base import View

class FormulaEView():
    # Create your views here.
    def index(request):
        return render(request, 'pages/index.html')