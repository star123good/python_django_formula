# python_django_formula
Python Django Project for Formula

# change env/mysql to fix mysqlclient version issue
env/lib/python3.8/site-packages/django/db/backends/mysql/base.py in line 36
if version < (1, 3, 13):
    pass
    '''
    raise ImproperlyConfigured('mysqlclient 1.3.13 or newer is required; you have %s.' % Database.__version__)
    '''

# mysql migrate
python manage.py migrate

# run server
python manage.py runserver
nohup python3 manage.py runserver 0.0.0.0:80 &