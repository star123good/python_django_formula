# Generated by Django 2.1.7 on 2019-08-16 17:12

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0007_auto_20190816_2331'),
        ('formula_2_3', '0006_time'),
    ]

    operations = [
        migrations.CreateModel(
            name='Weather',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('airtempTime', models.CharField(max_length=50, null=True)),
                ('airtemp', models.CharField(max_length=50, null=True)),
                ('humidityTime', models.CharField(max_length=50, null=True)),
                ('humidity', models.CharField(max_length=50, null=True)),
                ('pressureTime', models.CharField(max_length=50, null=True)),
                ('pressure', models.CharField(max_length=50, null=True)),
                ('rainfallTime', models.CharField(max_length=50, null=True)),
                ('rainfall', models.CharField(max_length=50, null=True)),
                ('tracktempTime', models.CharField(max_length=50, null=True)),
                ('tracktemp', models.CharField(max_length=50, null=True)),
                ('windspeedTime', models.CharField(max_length=50, null=True)),
                ('windspeed', models.CharField(max_length=50, null=True)),
                ('winddirTime', models.CharField(max_length=50, null=True)),
                ('winddir', models.CharField(max_length=50, null=True)),
                ('windclock', models.CharField(max_length=50, null=True)),
                ('created_at', models.CharField(max_length=255)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='user.Session')),
            ],
        ),
    ]