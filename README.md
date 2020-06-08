# python_django_formula
Python Django Project for Formula

# change env/mysql to fix mysqlclient version issue
env/lib/python3.8/site-packages/django/db/backends/mysql/base.py

# mysql migrate
python manage.py migrate

# run server
python manage.py runserver