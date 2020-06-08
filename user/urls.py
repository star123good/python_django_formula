from django.urls import path

from . import views

urlpatterns = [
    path('login', views.UserView.login, name='login'),
    path('register', views.UserView.register, name='register'),
    path('logout', views.UserView.logout, name='logout'),
    path('admin', views.UserView.admin, name='admin'),
    path('manage', views.UserView.manage, name='manage'),
]