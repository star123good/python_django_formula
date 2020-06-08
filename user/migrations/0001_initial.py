# Generated by Django 2.1.7 on 2019-08-16 12:14

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.CharField(max_length=255)),
                ('password', models.CharField(max_length=255)),
                ('championship', models.CharField(choices=[('f2', 'f2'), ('f3', 'f3'), ('fe', 'fe')], default='f2', max_length=2)),
                ('team_id', models.IntegerField()),
                ('privilege', models.CharField(choices=[('ALL', 'ALL'), ('SOME', 'SOME'), ('LESS', 'LESS'), ('POOR', 'POOR')], default='ALL', max_length=4)),
                ('is_admin', models.SmallIntegerField(default=0)),
            ],
        ),
    ]
