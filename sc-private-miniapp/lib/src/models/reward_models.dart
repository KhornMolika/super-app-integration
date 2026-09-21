import 'package:flutter/material.dart';

class VoucherItem {
  final String id;
  final String title;
  final String subtitle;
  final int cost;
  final IconData icon;
  final Color color;

  const VoucherItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.cost,
    required this.icon,
    required this.color,
  });
}

class ActivityItem {
  final String title;
  final String date;
  final String points;
  final bool isCredit;
  final IconData icon;

  const ActivityItem({
    required this.title,
    required this.date,
    required this.points,
    required this.isCredit,
    required this.icon,
  });
}
