from django.db import models

# Create your models here.
CHAMPIONSHIP_CHOICES = [
    ('f2', 'f2'),
    ('f3', 'f3'),
    ('fe', 'fe')
]

# team model
class Team(models.Model):
    championship = models.CharField(max_length=2, choices=CHAMPIONSHIP_CHOICES, default='f2')
    team_id = models.IntegerField()
    team_name = models.CharField(max_length=255)
    team_logo = models.CharField(max_length=255)

# user model
class User(models.Model):
    user_id = models.CharField(max_length=255)
    password = models.CharField(max_length=255)
    championship = models.CharField(max_length=2, choices=CHAMPIONSHIP_CHOICES, default='f2')
    # team_id = models.IntegerField()
    PRIVILEGE_CHOICES = [
        ('ALL', 'ALL'),
        ('SOME', 'SOME'),
        ('LESS', 'LESS'),
        ('POOR', 'POOR')
    ]
    privilege = models.CharField(max_length=4, choices=PRIVILEGE_CHOICES, default='ALL')
    is_admin = models.SmallIntegerField(default=0)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)

# circuit model
class Circuit(models.Model):
    title = models.CharField(max_length=255)
    country = models.CharField(max_length=50)
    date = models.CharField(max_length=255)
    length = models.CharField(max_length=50)
    year = models.CharField(max_length=5)

# player model
class Player(models.Model):
    number = models.IntegerField()
    name = models.CharField(max_length=255)
    # team_id = models.IntegerField()
    is_enable = models.SmallIntegerField(default=1)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)

# session model
class Session(models.Model):
    title = models.CharField(max_length=255)
    championship = models.CharField(max_length=2, choices=CHAMPIONSHIP_CHOICES, default='f2')
    start_time = models.DateTimeField(blank=True)
    laps = models.IntegerField()
    SESSION_TYPE_CHOICES = [
        ('PRACTICE','PRACTICE'),
        ('QUALIFYING','QUALIFYING'),
        ('RACE1','RACE1'),
        ('RACE2','RACE2')
    ]
    session_type = models.CharField(max_length=12, choices=SESSION_TYPE_CHOICES)
    SESSION_STATUS = [
        ('ready','ready'),
        ('record','record'),
        ('finished','finished')
    ]
    status = models.CharField(max_length=10, choices=SESSION_STATUS, default='ready')
    circuit = models.ForeignKey(Circuit, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)