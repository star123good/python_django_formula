# Generated by Django 3.0.7 on 2020-08-25 14:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0008_auto_20200625_1652'),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
