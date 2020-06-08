# Generated by Django 2.1.7 on 2019-08-16 17:11

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0007_auto_20190816_2331'),
        ('formula_2_3', '0005_statusmodel'),
    ]

    operations = [
        migrations.CreateModel(
            name='Time',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('epoc', models.CharField(max_length=50, null=True)),
                ('running', models.CharField(max_length=50, null=True)),
                ('remaining', models.CharField(max_length=100, null=True)),
                ('created_at', models.CharField(max_length=255)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='user.Session')),
            ],
        ),
    ]
