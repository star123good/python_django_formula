# Generated by Django 2.1.7 on 2019-08-16 15:31

from django.db import migrations, models
import django.db.models.deletion

def initDataToSessionTables(apps, schema_editor):
    Session = apps.get_model("user", "Session")
    User = apps.get_model("user", "User")
    Circuit = apps.get_model("user", "Circuit")
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=4)
    session = Session(title='F2. Silverstone Circuit - PRACTICE', championship='f2', start_time='2019-07-12 11:55:00', laps=0, session_type='PRACTICE', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=4)
    session = Session(title='F2. Silverstone Circuit - QUALIFYING', championship='f2', start_time='2019-07-12 15:55:00', laps=0, session_type='QUALIFYING', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=4)
    session = Session(title='F2. Silverstone Circuit - RACE1', championship='f2', start_time='2019-07-13 15:45:00', laps=29, session_type='RACE1', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=4)
    session = Session(title='F2. Silverstone Circuit - RACE2', championship='f2', start_time='2019-07-14 10:00:00', laps=21, session_type='RACE2', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=5)
    session = Session(title='F2. Hungaroring - PRACTICE', championship='f2', start_time='2019-08-02 13:00:00', laps=0, session_type='PRACTICE', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=5)
    session = Session(title='F2. Hungaroring - QUALIFYING', championship='f2', start_time='2019-08-02 16:55:00', laps=0, session_type='QUALIFYING', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=5)
    session = Session(title='F2. Hungaroring - RACE1', championship='f2', start_time='2019-08-03 10:10:00', laps=37, session_type='RACE1', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=5)
    session = Session(title='F2. Hungaroring - RACE2', championship='f2', start_time='2019-08-04 11:25:00', laps=28, session_type='RACE2', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=5)
    session = Session(title='F3. Hungaroring - PRACTICE', championship='f3', start_time='2019-08-02 09:35:00', laps=0, session_type='PRACTICE', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=5)
    session = Session(title='F3. Hungaroring - QUALIFYING', championship='f3', start_time='2019-08-03 09:00:00', laps=0, session_type='QUALIFYING', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=5)
    session = Session(title='F3. Hungaroring - RACE1', championship='f3', start_time='2019-08-03 16:45:00', laps=22, session_type='RACE1', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=5)
    session = Session(title='F3. Hungaroring - RACE2', championship='f3', start_time='2019-08-04 10:00:00', laps=22, session_type='RACE2', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=6)
    session = Session(title='F2. Circuit de Spa-Francorchamps - PRACTICE', championship='f2', start_time='2019-08-30 13:00:00', laps=0, session_type='PRACTICE', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=6)
    session = Session(title='F2. Circuit de Spa-Francorchamps - QUALIFYING', championship='f2', start_time='2019-08-30 16:55:00', laps=0, session_type='QUALIFYING', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=6)
    session = Session(title='F2. Circuit de Spa-Francorchamps - RACE1', championship='f2', start_time='2019-08-31 16:45:00', laps=25, session_type='RACE1', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=6)
    session = Session(title='F2. Circuit de Spa-Francorchamps - RACE2', championship='f2', start_time='2019-09-01 11:15:00', laps=18, session_type='RACE2', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=6)
    session = Session(title='F3. Circuit de Spa-Francorchamps - PRACTICE', championship='f3', start_time='2019-08-30 09:35:00', laps=0, session_type='PRACTICE', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=6)
    session = Session(title='F3. Circuit de Spa-Francorchamps - QUALIFYING', championship='f3', start_time='2019-08-30 17:50:00', laps=0, session_type='QUALIFYING', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=6)
    session = Session(title='F3. Circuit de Spa-Francorchamps - RACE1', championship='f3', start_time='2019-08-31 10:35:00', laps=17, session_type='RACE1', status='ready', circuit=circuit, user=user)
    session.save()
    user = User.objects.get(id=1)
    circuit = Circuit.objects.get(id=6)
    session = Session(title='F3. Circuit de Spa-Francorchamps - RACE2', championship='f3', start_time='2019-09-01 09:45:00', laps=17, session_type='RACE2', status='ready', circuit=circuit, user=user)
    session.save()


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0006_session'),
    ]

    operations = [
        migrations.RunPython(initDataToSessionTables),
    ]