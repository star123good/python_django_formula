from django.urls import path

from . import views

urlpatterns = [
    path('', views.FormulaEView.index, name='index'),
]