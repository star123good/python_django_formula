# Generated by Django 2.1.7 on 2019-08-16 16:53

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0007_auto_20190816_2331'),
        ('formula_2_3', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Data',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('series', models.CharField(max_length=50, null=True)),
                ('session', models.CharField(max_length=50, null=True)),
                ('DataWithheld', models.CharField(max_length=50, null=True)),
                ('Number', models.IntegerField(null=True)),
                ('positionShow', models.IntegerField(null=True)),
                ('positionValue', models.IntegerField(null=True)),
                ('statusRetired', models.IntegerField(null=True)),
                ('statusInPit', models.IntegerField(null=True)),
                ('statusPitOut', models.IntegerField(null=True)),
                ('statusStopped', models.IntegerField(null=True)),
                ('statusts', models.CharField(max_length=100, null=True)),
                ('RacingNumber', models.IntegerField(null=True)),
                ('FullName', models.CharField(max_length=50, null=True)),
                ('BroadcastName', models.CharField(max_length=50, null=True)),
                ('TLA', models.CharField(max_length=50, null=True)),
                ('gap', models.CharField(max_length=50, null=True)),
                ('interval', models.CharField(max_length=50, null=True)),
                ('laps', models.CharField(max_length=50, null=True)),
                ('pits', models.CharField(max_length=50, null=True)),
                ('OverallFastest0', models.IntegerField(null=True)),
                ('PersonalFastest0', models.IntegerField(null=True)),
                ('Stopped0', models.IntegerField(null=True)),
                ('Id0', models.IntegerField(null=True)),
                ('Value0', models.CharField(max_length=50, null=True)),
                ('OverallFastest1', models.IntegerField(null=True)),
                ('PersonalFastest1', models.IntegerField(null=True)),
                ('Stopped1', models.IntegerField(null=True)),
                ('Id1', models.IntegerField(null=True)),
                ('Value1', models.CharField(max_length=50, null=True)),
                ('OverallFastest2', models.IntegerField(null=True)),
                ('PersonalFastest2', models.IntegerField(null=True)),
                ('Stopped2', models.IntegerField(null=True)),
                ('Id2', models.IntegerField(null=True)),
                ('Value2', models.CharField(max_length=50, null=True)),
                ('lastOverallFastest', models.IntegerField(null=True)),
                ('lastPersonalFastest', models.IntegerField(null=True)),
                ('lastValue', models.CharField(max_length=50, null=True)),
                ('bestLap', models.IntegerField(null=True)),
                ('bestValue', models.CharField(max_length=50, null=True)),
                ('created_at', models.CharField(max_length=255)),
                ('is_process', models.SmallIntegerField(default=0)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='user.Session')),
            ],
        ),
    ]