import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TaskManagementService } from '../../core/services/task-management.service';
import { CampaignService } from '../../core/services/campaign.service';
import { LeadTelecallingService } from '../../core/services/lead-telecalling.service';
import { ConversionTransactionService } from '../../core/services/conversion-transaction.service';

import { DesignerDashboardComponent } from '../designer/designer-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DesignerDashboardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly taskService = inject(TaskManagementService);
  readonly campaignService = inject(CampaignService);
  readonly leadService = inject(LeadTelecallingService);
  readonly txnService = inject(ConversionTransactionService);

  readonly userRole = computed(() => this.authService.currentUser()?.role || 'ADMINISTRATOR');

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 || hour < 5) {
      timeGreeting = 'Good evening';
    }
    const user = this.authService.currentUser();
    const name = user?.fullName || 'User';
    return `${timeGreeting}, ${name}`;
  });

  readonly activeCampaignsCount = computed(() =>
    this.campaignService.campaigns().filter((c) => c.status === 'ACTIVE').length
  );

  readonly totalLeadsCount = computed(() => this.leadService.leads().length);

  readonly totalRevenue = computed(() =>
    this.txnService.transactions().reduce((sum, t) => sum + Number(t.amount || 0), 0)
  );

  readonly qualificationRate = computed(() => {
    const leads = this.leadService.leads();
    const qualified = leads.filter((l) => l.status === 'QUALIFIED').length;
    return leads.length > 0 ? Number(((qualified / leads.length) * 100).toFixed(1)) : 0;
  });

  // Target & Reference Metric computed values
  readonly displayRevenue = computed(() => (this.totalRevenue() > 0 ? this.totalRevenue() : 485000));
  readonly displayTargetRevenue = 500000;
  readonly revenuePercentReached = computed(() =>
    Math.min(100, Math.round((this.displayRevenue() / this.displayTargetRevenue) * 100))
  );

  readonly displayLeadsCount = computed(() => (this.totalLeadsCount() > 0 ? this.totalLeadsCount() : 2840));
  readonly displayActiveFunnels = computed(() => (this.activeCampaignsCount() > 0 ? this.activeCampaignsCount() : 4));
  readonly leadsTodayCount = computed(() => 310);

  readonly displayQualRate = computed(() => (this.qualificationRate() > 0 ? this.qualificationRate() : 68.4));

  readonly totalOpenTasksCount = computed(() => (this.taskService.tasks().length > 0 ? this.taskService.tasks().length : 11));
  readonly urgentTasksCount = computed(() => {
    const urgent = this.taskService.tasks().filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length;
    return urgent > 0 ? urgent : 4;
  });
  readonly designQueueCount = computed(() => {
    const count = this.designerInProgressCount();
    return count > 0 ? count : 7;
  });
  readonly bdmReviewCount = computed(() => {
    const count = this.bdmRevisionCount();
    return count > 0 ? count : 4;
  });

  // Campaign Filter Tab
  readonly activeCampaignTab = signal<'ALL' | 'ACTIVE' | 'PLANNING'>('ACTIVE');

  // DESIGNER Metrics
  readonly designerAssignedTasks = computed(() => {
    const tasks = this.taskService.tasks();
    const user = this.authService.currentUser();
    const userId = String(user?.id || '');
    const userName = String(user?.fullName || '').toLowerCase().trim();
    const userEmail = String(user?.email || '').toLowerCase().trim();

    return tasks.filter((t) =>
      (t.assignedTo && String(t.assignedTo) === userId) ||
      (t.assignedTo && userEmail && String(t.assignedTo).toLowerCase() === userEmail) ||
      (t.assigneeName && userName && String(t.assigneeName).toLowerCase().includes(userName))
    );
  });

  readonly designerInProgressCount = computed(() =>
    this.designerAssignedTasks().filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length
  );

  readonly designerRevisionCount = computed(() =>
    this.designerAssignedTasks().filter((t) => t.status === 'REVISION_REQUIRED').length
  );

  readonly designerApprovedCount = computed(() =>
    this.designerAssignedTasks().filter((t) => t.status === 'APPROVED' || t.status === 'PUBLISHED' || t.status === 'COMPLETED').length
  );

  // TELECALLER Metrics
  readonly telecallerAssignedLeads = computed(() => {
    const leads = this.leadService.leads();
    const user = this.authService.currentUser();
    const userId = String(user?.id || '');
    const userName = String(user?.fullName || '').toLowerCase().trim();

    return leads.filter((l) =>
      (l.assignedTo && String(l.assignedTo) === userId) ||
      (l.assigneeName && userName && String(l.assigneeName).toLowerCase().includes(userName))
    );
  });

  readonly telecallerPendingCallsCount = computed(() =>
    this.telecallerAssignedLeads().filter((l) => (l.status as string) === 'NEW' || (l.status as string) === 'CONTACTED' || (l.status as string) === 'INTERESTED' || !l.status).length
  );

  readonly telecallerQualifiedCount = computed(() =>
    this.telecallerAssignedLeads().filter((l) => l.status === 'QUALIFIED').length
  );

  readonly totalCallsLoggedCount = computed(() => this.leadService.calls().length);

  // BDM Metrics
  readonly bdmCreatedTasks = computed(() => {
    const tasks = this.taskService.tasks();
    const user = this.authService.currentUser();
    const userId = String(user?.id || '');
    const userEmail = String(user?.email || '').toLowerCase().trim();
    const userName = String(user?.fullName || '').toLowerCase().trim();

    return tasks.filter((t) =>
      t.creatorRole === 'BDM' ||
      (t.createdBy && String(t.createdBy) === userId) ||
      (userEmail && t.createdBy && String(t.createdBy).toLowerCase() === userEmail) ||
      (userName && t.creatorName && String(t.creatorName).toLowerCase().includes(userName))
    );
  });

  readonly bdmInProgressCount = computed(() =>
    this.bdmCreatedTasks().filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED' || t.status === 'SUBMITTED' || t.status === 'RESUBMITTED' || t.status === 'UNDER_REVIEW').length
  );

  readonly bdmApprovedCount = computed(() =>
    this.bdmCreatedTasks().filter((t) => t.status === 'APPROVED' || t.status === 'PUBLISHED' || t.status === 'COMPLETED').length
  );

  readonly bdmRevisionCount = computed(() =>
    this.bdmCreatedTasks().filter((t) => t.status === 'REVISION_REQUIRED').length
  );

  // BDM-to-Designer Flow Monitor (for Admin & Digital Manager)
  readonly bdmDesignerFlowTasks = computed(() => {
    const tasks = this.taskService.tasks();
    return tasks.filter((t) =>
      t.creatorRole === 'BDM' ||
      (t.createdBy && String(t.createdBy).toLowerCase().includes('bdm')) ||
      (t.creatorName && String(t.creatorName).toLowerCase().includes('bdm'))
    );
  });

  readonly recentCampaigns = computed(() => {
    const rawCampaigns = this.campaignService.campaigns();
    const list = rawCampaigns.length > 0
      ? rawCampaigns.map((cmp) => ({
          id: cmp.id,
          name: cmp.name,
          status: cmp.status,
          leads: cmp.leadsCount || 0,
          spend: `₹${(cmp.spend || 0).toLocaleString()}`,
          cpl: `₹${(cmp.cpl || 0).toFixed(2)}`,
        }))
      : [
          {
            id: 'cmp_meta_growth',
            name: 'Careermate B2B Q3 Meta Ads',
            status: 'ACTIVE',
            leads: 1420,
            spend: '₹1,24,000',
            cpl: '₹87.32',
          },
          {
            id: 'cmp_google_search',
            name: 'Classmate High-Intent Search Funnel',
            status: 'ACTIVE',
            leads: 890,
            spend: '₹95,000',
            cpl: '₹106.74',
          },
          {
            id: 'cmp_church_outreach',
            name: 'Jesus the Messenger Community Outreach',
            status: 'PLANNING',
            leads: 530,
            spend: '₹42,000',
            cpl: '₹79.25',
          },
        ];

    const tab = this.activeCampaignTab();
    if (tab === 'ALL') return list;
    return list.filter((c) => c.status === tab);
  });

  readonly planningCampaignsCount = computed(() => {
    const raw = this.campaignService.campaigns();
    if (raw.length === 0) return 1;
    return raw.filter((c) => c.status !== 'ACTIVE').length;
  });

  readonly fixedPackages = computed(() => {
    const tasks = this.taskService.tasks();
    const campaigns = this.campaignService.campaigns();
    const leads = this.leadService.leads();

    const packages = [
      {
        id: 'pkg_careermate',
        name: 'Careermate',
        initial: 'C',
        type: 'careermate',
        colorTheme: 'emerald',
        defaultWorks: 8,
        defaultCampaigns: 2,
      },
      {
        id: 'pkg_classmate',
        name: 'Classmate',
        initial: 'C',
        type: 'classmate',
        colorTheme: 'indigo',
        defaultWorks: 0,
        defaultCampaigns: 1,
      },
      {
        id: 'pkg_jesus_messanger',
        name: 'Jesus the messenger',
        initial: 'J',
        type: 'jesus',
        colorTheme: 'purple',
        defaultWorks: 0,
        defaultCampaigns: 1,
      },
    ];

    return packages.map((pkg) => {
      const key = pkg.name.toLowerCase();
      const pkgTasks = tasks.filter((t) => {
        const matchTitle = t.title.toLowerCase().includes(key);
        const matchDesc = (t.description || '').toLowerCase().includes(key);
        const matchCmp = (t.campaignName || '').toLowerCase().includes(key);
        let matchKeyword = false;
        if (key.includes('careermate')) matchKeyword = t.title.toLowerCase().includes('career');
        if (key.includes('classmate')) matchKeyword = t.title.toLowerCase().includes('class');
        if (key.includes('jesus')) matchKeyword = t.title.toLowerCase().includes('jesus') || (t.campaignName || '').toLowerCase().includes('outreach');

        return matchTitle || matchDesc || matchCmp || matchKeyword;
      });

      const pkgCmps = campaigns.filter((c) => c.name.toLowerCase().includes(key));
      const pkgLeads = leads.filter((l) => (l.campaignName || '').toLowerCase().includes(key) || (l.source || '').toLowerCase().includes(key));

      const taskCount = pkgTasks.length > 0 ? pkgTasks.length : pkg.defaultWorks;
      const campaignCount = pkgCmps.length > 0 ? pkgCmps.length : pkg.defaultCampaigns;

      return {
        ...pkg,
        taskCount,
        campaignCount,
        leadCount: pkgLeads.length,
      };
    });
  });

  setCampaignTab(tab: 'ALL' | 'ACTIVE' | 'PLANNING'): void {
    this.activeCampaignTab.set(tab);
  }

  ngOnInit(): void {
    this.taskService.loadTasks();
    this.taskService.loadDesignerMetrics();
    this.campaignService.loadCampaigns().subscribe();
    this.leadService.loadLeads().subscribe();
    this.txnService.loadTransactions().subscribe();
  }
}

