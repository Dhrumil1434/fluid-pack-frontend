import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatCard {
  title: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
  description?: string;
}

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-cards.component.html',
  styleUrls: ['./stats-cards.component.css']
})
export class StatsCardsComponent implements OnInit {
  @Input() data: StatCard[] = [];

  // Default stats if no data provided
  defaultStats: StatCard[] = [
    {
      title: 'Total Users',
      value: 0,
      change: 0,
      changeType: 'neutral',
      icon: 'pi pi-users',
      color: 'blue',
      description: 'Registered users'
    },
    {
      title: 'Total Machines',
      value: 0,
      change: 0,
      changeType: 'neutral',
      icon: 'pi pi-cog',
      color: 'green',
      description: 'Active machines'
    },
    {
      title: 'Pending Approvals',
      value: 0,
      change: 0,
      changeType: 'neutral',
      icon: 'pi pi-clock',
      color: 'orange',
      description: 'Awaiting approval'
    },
    {
      title: 'QA Entries',
      value: 0,
      change: 0,
      changeType: 'neutral',
      icon: 'pi pi-check-circle',
      color: 'purple',
      description: 'Quality assurance entries'
    }
  ];

  ngOnInit() {
    // Use default stats if no data provided
    if (!this.data || this.data.length === 0) {
      this.data = this.defaultStats;
    }
  }

  /**
   * Get the change percentage text
   */
  getChangeText(change: number): string {
    if (change === 0) return 'No change';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}%`;
  }

  /**
   * Get the change icon class
   */
  getChangeIconClass(changeType: string): string {
    switch (changeType) {
      case 'increase':
        return 'pi pi-arrow-up';
      case 'decrease':
        return 'pi pi-arrow-down';
      default:
        return 'pi pi-minus';
    }
  }

  /**
   * Get the change color class
   */
  getChangeColorClass(changeType: string): string {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Get the card color class
   */
  getCardColorClass(color: string): string {
    return `card-${color}`;
  }

  /**
   * Get gradient class for hover effect
   */
  getGradientClass(color: string): string {
    switch (color) {
      case 'blue':
        return 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10';
      case 'green':
        return 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10';
      case 'orange':
        return 'bg-gradient-to-br from-amber-500/10 to-orange-500/10';
      case 'purple':
        return 'bg-gradient-to-br from-purple-500/10 to-pink-500/10';
      case 'red':
        return 'bg-gradient-to-br from-red-500/10 to-pink-500/10';
      default:
        return 'bg-gradient-to-br from-gray-500/10 to-gray-600/10';
    }
  }

  /**
   * Get icon background class
   */
  getIconBgClass(color: string): string {
    switch (color) {
      case 'blue':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'green':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
      case 'orange':
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'purple':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'red':
        return 'bg-gradient-to-r from-red-500 to-pink-500';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  }

  /**
   * Format large numbers
   */
  formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  /**
   * Track by function for stat cards
   */
  trackByStatCard(index: number, stat: StatCard): string {
    return stat.title;
  }
}
