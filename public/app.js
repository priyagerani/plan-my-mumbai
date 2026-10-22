/**
 * AuraPlan AI - Frontend Application Controller
 * Handles frictionless intake, generative streaming stages, 4-quadrant rendering,
 * interactive budgeting sliders, WhatsApp copy & conversational refinement.
 */

class AuraPlanApp {
  constructor() {
    this.currentPlan = null;
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
    this.activeTab = 'tab-budget';
    this.activeTimelineView = 'countdown'; // 'countdown' or 'runOfShow'

    this.initElements();
    this.bindEvents();
    this.checkServerStatus();
    this.loadSavedPlan();
    this.resetToHomepage(true);
  }

  initElements() {
    // Header & Actions
    this.brandLogoLink = document.getElementById('brandLogoLink') || document.querySelector('.brand-link');
    this.aiEngineBadge = document.getElementById('aiEngineBadge');
    this.aiEngineLabel = document.getElementById('aiEngineLabel');
    this.apiKeyBtn = document.getElementById('apiKeyBtn');
    this.exportPdfBtn = document.getElementById('exportPdfBtn');

    // Intake Form & Drawer
    this.intakeSection = document.getElementById('intakeSection');
    this.planForm = document.getElementById('planForm');
    this.naturalPromptInput = document.getElementById('naturalPromptInput');
    this.generatePlanBtn = document.getElementById('generatePlanBtn');
    this.guidedDrawer = document.getElementById('guidedDrawer');
    this.modePromptBtn = document.getElementById('modePromptBtn');
    this.modeParamsBtn = document.getElementById('modeParamsBtn');
    this.promptModeSection = document.getElementById('promptModeSection');
    this.paramsModeSection = document.getElementById('paramsModeSection');
    this.liveDirectiveBadge = document.getElementById('liveDirectiveBadge');
    this.btnGenerateFromParams = document.getElementById('btnGenerateFromParams');
    this.locChips = document.querySelectorAll('.loc-chip');
    this.prefChips = document.querySelectorAll('.pref-chip');

    this.eventTypeSelect = document.getElementById('eventTypeSelect');
    this.localityInput = document.getElementById('localityInput');
    this.guestsInput = document.getElementById('guestsInput');
    this.guestsDisplay = document.getElementById('guestsDisplay');
    this.budgetInput = document.getElementById('budgetInput');
    this.budgetDisplay = document.getElementById('budgetDisplay');

    // Preset Pills
    this.presetPills = document.querySelectorAll('.preset-pill');

    // Loading Stage
    this.aiLoadingStage = document.getElementById('aiLoadingStage');
    this.loadingStepTitle = document.getElementById('loadingStepTitle');
    this.loadingStepDesc = document.getElementById('loadingStepDesc');

    // Personalized Ideas Input
    this.customIdeasInput = document.getElementById('customIdeasInput');
    this.ideaChips = document.querySelectorAll('.idea-chip');

    // Dashboard Section & Workspace Header
    this.dashboardSection = document.getElementById('dashboardSection');
    this.planEventKicker = document.getElementById('planEventKicker');
    this.planEventTitle = document.getElementById('planEventTitle');
    this.planEventMeta = document.getElementById('planEventMeta');
    this.badgeEventType = document.getElementById('badgeEventType');
    this.badgeLocality = document.getElementById('badgeLocality');
    this.badgeEngine = document.getElementById('badgeEngine');
    this.btnShareWhatsApp = document.getElementById('btnShareWhatsApp');
    this.btnResetPlan = document.getElementById('btnResetPlan');

    this.planEventSummary = document.getElementById('planEventSummary');
    this.kpiTotalBudget = document.getElementById('kpiTotalBudget');
    this.kpiProjectedSub = document.getElementById('kpiProjectedSub');
    this.kpiGuests = document.getElementById('kpiGuests');
    this.kpiPerGuest = document.getElementById('kpiPerGuest');
    this.kpiVibe = document.getElementById('kpiVibe');

    // Tabs
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Quadrant 1: Budget
    this.tradeoffText = document.getElementById('tradeoffText');
    this.tweakGuestsSlider = document.getElementById('tweakGuestsSlider');
    this.tweakGuestsVal = document.getElementById('tweakGuestsVal');
    this.tweakBudgetSlider = document.getElementById('tweakBudgetSlider');
    this.tweakBudgetVal = document.getElementById('tweakBudgetVal');
    this.btnRecalculateBudget = document.getElementById('btnRecalculateBudget');
    this.budgetCategoriesList = document.getElementById('budgetCategoriesList');

    // Quadrant 2: Timelines
    this.viewCountdownBtn = document.getElementById('viewCountdownBtn');
    this.viewRunOfShowBtn = document.getElementById('viewRunOfShowBtn');
    this.layerPrepCountdown = document.getElementById('layerPrepCountdown');
    this.layerRunOfShow = document.getElementById('layerRunOfShow');
    this.prepPhasesList = document.getElementById('prepPhasesList');
    this.runOfShowList = document.getElementById('runOfShowList');

    // Quadrant 3: Vendors
    this.vendorCategoriesList = document.getElementById('vendorCategoriesList');

    // Quadrant 4: Ideas & Creative
    this.themeTitle = document.getElementById('themeTitle');
    this.themeVisualVibe = document.getElementById('themeVisualVibe');
    this.themeDescription = document.getElementById('themeDescription');
    this.paletteSwatchesList = document.getElementById('paletteSwatchesList');
    this.inviteCopyText = document.getElementById('inviteCopyText');
    this.btnCopyInvite = document.getElementById('btnCopyInvite');
    this.btnOpenWhatsApp = document.getElementById('btnOpenWhatsApp');
    this.activitiesList = document.getElementById('activitiesList');
    this.menuSectionsList = document.getElementById('menuSectionsList');

    // Conversational Refinement
    this.refinementForm = document.getElementById('refinementForm');
    this.refinementInput = document.getElementById('refinementInput');
    this.btnRefinePlan = document.getElementById('btnRefinePlan');

    // Modals & Toast
    this.apiKeyModal = document.getElementById('apiKeyModal');
    this.closeApiKeyModalBtn = document.getElementById('closeApiKeyModalBtn');
    this.geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    this.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    this.clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
    this.apiKeyStatusAlert = document.getElementById('apiKeyStatusAlert');
    this.toastNotification = document.getElementById('toastNotification');
    this.toastMessage = document.getElementById('toastMessage');

    // 3-Level Priority Architecture
    this.prioritiesState = {};
    this.prioritySummaryText = document.getElementById('prioritySummaryText');
    this.mustHaveCapNotice = document.getElementById('mustHaveCapNotice');

    // Budget Results Elements
    this.budgetRealityCheckBanner = document.getElementById('budgetRealityCheckBanner');
    this.protectedItemsCard = document.getElementById('protectedItemsCard');
    this.budgetTableBody = document.getElementById('budgetTableBody');
    this.budgetTotalPill = document.getElementById('budgetTotalPill');
    this.tradeoffsCard = document.getElementById('tradeoffsCard');
    this.tradeoffsList = document.getElementById('tradeoffsList');
    this.upgradesCard = document.getElementById('upgradesCard');
    this.upgradesList = document.getElementById('upgradesList');

    // Vendor Featured Elements
    this.featuredVenuesGrid = document.getElementById('featuredVenuesGrid');
    this.featuredCateringGrid = document.getElementById('featuredCateringGrid');
    this.cateringWhyTheseTwo = document.getElementById('cateringWhyTheseTwo');
    this.venueExternalSearchBtn = document.getElementById('venueExternalSearchBtn');
    this.venueSectionSubtitle = document.getElementById('venueSectionSubtitle');

    // Shortlist Modal
    this.shortlistModal = document.getElementById('shortlistModal');
    this.btnOpenShortlistModal = document.getElementById('btnOpenShortlistModal');
    this.closeShortlistModalBtn = document.getElementById('closeShortlistModalBtn');
    this.cancelShortlistBtn = document.getElementById('cancelShortlistBtn');
    this.shortlistForm = document.getElementById('shortlistForm');
  }

  bindEvents() {
    this.bindPriorityControls();
    this.bindShortlistModal();
    // Mode Switcher Buttons: Strict Mutually Exclusive Toggling
    if (this.modePromptBtn && this.modeParamsBtn) {
      this.modePromptBtn.addEventListener('click', () => {
        this.modePromptBtn.classList.add('active');
        this.modePromptBtn.setAttribute('aria-selected', 'true');
        this.modeParamsBtn.classList.remove('active');
        this.modeParamsBtn.setAttribute('aria-selected', 'false');
        if (this.promptModeSection) this.promptModeSection.style.display = 'block';
        if (this.paramsModeSection) this.paramsModeSection.style.display = 'none';
      });

      this.modeParamsBtn.addEventListener('click', () => {
        this.modeParamsBtn.classList.add('active');
        this.modeParamsBtn.setAttribute('aria-selected', 'true');
        this.modePromptBtn.classList.remove('active');
        this.modePromptBtn.setAttribute('aria-selected', 'false');
        if (this.paramsModeSection) this.paramsModeSection.style.display = 'block';
        if (this.promptModeSection) this.promptModeSection.style.display = 'none';
      });
    }

    // Live Directive Updater
    const updateLiveDirective = () => {
      const typeIcons = { birthday: '🎂 Birthday', wedding: '💍 Wedding', community: '🎪 Community Festival' };
      const eventLabel = typeIcons[this.eventTypeSelect.value] || '🎉 Event';
      const locality = this.localityInput.value.trim() || 'Mumbai';
      const guests = this.guestsInput.value;
      const budget = parseInt(this.budgetInput.value, 10).toLocaleString('en-IN');
      const selectedPrefs = Array.from(document.querySelectorAll('.pref-chip.selected')).map(c => c.textContent.trim());

      let directive = `${eventLabel} • ${locality} • ${guests} Guests • ₹${budget}`;
      if (selectedPrefs.length > 0) {
        directive += ` • (${selectedPrefs.slice(0, 2).join(', ')})`;
      }

      if (this.liveDirectiveBadge) {
        this.liveDirectiveBadge.textContent = directive;
      }
    };
    this.updateLiveDirective = updateLiveDirective;

    // Range input sync & reactive live directive
    this.guestsInput.addEventListener('input', (e) => {
      this.guestsDisplay.textContent = e.target.value + ' Guests';
      updateLiveDirective();
    });

    this.budgetInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.budgetDisplay.textContent = '₹' + val.toLocaleString('en-IN');
      updateLiveDirective();
    });

    this.eventTypeSelect.addEventListener('change', updateLiveDirective);
    this.localityInput.addEventListener('input', updateLiveDirective);

    // Quick Locality Chips
    this.locChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.localityInput.value = chip.dataset.loc;
        this.locChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        updateLiveDirective();
      });
    });

    // Preference Chips (Toggle)
    this.prefChips.forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        updateLiveDirective();
      });
    });

    // Direct Parameter Submit Button
    if (this.btnGenerateFromParams) {
      this.btnGenerateFromParams.addEventListener('click', () => {
        this.handleGeneratePlan();
      });
    }

    // Initial update of directive
    updateLiveDirective();

    // 1-Click Preset Pills
    this.presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const preset = pill.dataset.preset;
        this.applyPreset(preset);
      });
    });

    // Brand Logo Click -> Reset to Homepage status at top snippet
    if (this.brandLogoLink) {
      this.brandLogoLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetToHomepage(false);
      });
    }

    // Idea Quick Chips
    if (this.ideaChips) {
      this.ideaChips.forEach(chip => {
        chip.addEventListener('click', () => {
          if (this.customIdeasInput) {
            const idea = chip.dataset.idea;
            if (!this.customIdeasInput.value) {
              this.customIdeasInput.value = idea;
            } else if (!this.customIdeasInput.value.includes(idea)) {
              this.customIdeasInput.value += ', ' + idea;
            }
            chip.classList.toggle('active');
          }
        });
      });
    }

    // Smooth Scroll for "Begin Planning" buttons to the Intake Interface
    document.querySelectorAll('a[href="#intakeSection"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.intakeSection) {
          this.intakeSection.style.display = 'block';
          this.intakeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Form Submission
    this.planForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleGeneratePlan();
    });

    // Reset Plan Button -> Reset to Homepage
    if (this.btnResetPlan) {
      this.btnResetPlan.addEventListener('click', () => {
        this.resetToHomepage(false);
      });
    }

    // Export PDF Print
    if (this.exportPdfBtn) {
      this.exportPdfBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Share WhatsApp Button
    if (this.btnShareWhatsApp) {
      this.btnShareWhatsApp.addEventListener('click', () => {
        this.sharePlanSummary();
      });
    }

    // Tab Navigation
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Timeline Layer Toggles
    if (this.viewCountdownBtn) {
      this.viewCountdownBtn.addEventListener('click', () => {
        this.switchTimelineLayer('countdown');
      });
    }
    if (this.viewRunOfShowBtn) {
      this.viewRunOfShowBtn.addEventListener('click', () => {
        this.switchTimelineLayer('runOfShow');
      });
    }

    // Budget Sliders (guarded in case tweak card is hidden)
    if (this.tweakGuestsSlider) {
      this.tweakGuestsSlider.addEventListener('input', (e) => {
        if (this.tweakGuestsVal) this.tweakGuestsVal.textContent = e.target.value;
      });
    }
    if (this.tweakBudgetSlider) {
      this.tweakBudgetSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.tweakBudgetVal) this.tweakBudgetVal.textContent = '₹' + val.toLocaleString('en-IN');
      });
    }
    if (this.btnRecalculateBudget) {
      this.btnRecalculateBudget.addEventListener('click', () => {
        this.handleRecalculateBudget();
      });
    }

    // Copy Invite & WhatsApp Opener
    this.btnCopyInvite.addEventListener('click', () => {
      if (this.currentPlan?.personalizedIdeas?.whatsappInviteCopy) {
        navigator.clipboard.writeText(this.currentPlan.personalizedIdeas.whatsappInviteCopy);
        this.showToast('📋 WhatsApp invitation copied to clipboard!');
      }
    });

    this.btnOpenWhatsApp.addEventListener('click', () => {
      if (this.currentPlan?.personalizedIdeas?.whatsappInviteCopy) {
        const text = encodeURIComponent(this.currentPlan.personalizedIdeas.whatsappInviteCopy);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
      }
    });

    // Conversational Refinement Form (if present)
    if (this.refinementForm) {
      this.refinementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRefinement();
      });
    }

    // API Key Modal Controls
    this.apiKeyBtn.addEventListener('click', () => {
      this.geminiApiKeyInput.value = this.apiKey;
      this.apiKeyStatusAlert.style.display = 'none';
      this.apiKeyModal.style.display = 'flex';
    });

    this.closeApiKeyModalBtn.addEventListener('click', () => {
      this.apiKeyModal.style.display = 'none';
    });

    this.saveApiKeyBtn.addEventListener('click', () => {
      this.handleSaveApiKey();
    });

    this.clearApiKeyBtn.addEventListener('click', () => {
      this.apiKey = '';
      localStorage.removeItem('gemini_api_key');
      this.geminiApiKeyInput.value = '';
      this.showToast('API Key cleared. Reverting to local grounding synthesizer.');
      this.apiKeyModal.style.display = 'none';
      this.checkServerStatus();
    });
  }

  async checkServerStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.hasApiKey || (this.apiKey && this.apiKey.length > 10)) {
          this.aiEngineBadge.className = 'status-pill status-ready';
          this.aiEngineLabel.textContent = 'Gemini 2.5 Flash Online 🟢';
        } else {
          this.aiEngineBadge.className = 'status-pill';
          this.aiEngineLabel.textContent = 'Intelligent Grounding Ready 🟡';
        }
      }
    } catch (e) {
      this.aiEngineLabel.textContent = 'Offline Engine Active';
    }
  }

  async handleSaveApiKey() {
    const key = this.geminiApiKeyInput.value.trim();
    if (!key) {
      this.showApiKeyAlert('Please enter a valid Gemini API key.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });

      if (res.ok) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        this.showToast('✅ Gemini API key activated successfully!');
        this.apiKeyModal.style.display = 'none';
        this.checkServerStatus();
      } else {
        const err = await res.json();
        this.showApiKeyAlert(err.error || 'Failed to save key', 'error');
      }
    } catch (err) {
      this.showApiKeyAlert('Network error saving key', 'error');
    }
  }

  bindPriorityControls() {
    const cards = document.querySelectorAll('.priority-chip-card');
    cards.forEach(card => {
      const key = card.dataset.key;
      const toggleBtn = card.querySelector('.chip-toggle-btn');
      const segControl = card.querySelector('.priority-segmented-control');
      const statusTag = card.querySelector('.chip-status-tag');
      const segBtns = card.querySelectorAll('.seg-btn');

      this.prioritiesState[key] = {
        selected: false,
        level: 'important'
      };

      toggleBtn?.addEventListener('click', () => {
        const state = this.prioritiesState[key];
        state.selected = !state.selected;

        if (state.selected) {
          card.classList.add('selected');
          if (segControl) segControl.style.display = 'flex';
          if (statusTag) statusTag.textContent = state.level === 'nonNegotiable' ? '🔒 Must-have' : (state.level === 'flexible' ? '💸 Flexible' : '⭐ Important');
        } else {
          card.classList.remove('selected');
          if (segControl) segControl.style.display = 'none';
          if (statusTag) statusTag.textContent = 'Add';
        }

        this.updatePrioritySummary();
      });

      segBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const level = btn.dataset.level;
          const state = this.prioritiesState[key];

          state.level = level;
          segBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          if (statusTag) {
            statusTag.textContent = level === 'nonNegotiable' ? '🔒 Must-have' : (level === 'flexible' ? '💸 Flexible' : '⭐ Important');
          }

          this.updatePrioritySummary();
        });
      });
    });
  }

  updatePrioritySummary() {
    const nonNeg = [];
    const important = [];
    const flexible = [];

    for (const [key, state] of Object.entries(this.prioritiesState)) {
      if (state.selected) {
        if (state.level === 'nonNegotiable') nonNeg.push(key);
        else if (state.level === 'flexible') flexible.push(key);
        else important.push(key);
      }
    }

    // Soft-cap alert for > 3 non-negotiables
    if (this.mustHaveCapNotice) {
      if (nonNeg.length > 3) {
        this.mustHaveCapNotice.style.display = 'flex';
      } else {
        this.mustHaveCapNotice.style.display = 'none';
      }
    }

    let summaryText = '⭐ All balanced at Important level (Default)';
    if (nonNeg.length > 0 || flexible.length > 0 || important.length > 0) {
      const parts = [];
      if (nonNeg.length > 0) parts.push(`🔒 ${nonNeg.join(', ')}`);
      if (important.length > 0) parts.push(`⭐ ${important.join(', ')}`);
      if (flexible.length > 0) parts.push(`💸 ${flexible.join(', ')}`);
      summaryText = parts.join(' • ');
    }

    if (this.prioritySummaryText) {
      this.prioritySummaryText.textContent = summaryText;
    }

    if (this.updateLiveDirective) {
      this.updateLiveDirective();
    }
  }

  bindShortlistModal() {
    if (this.btnOpenShortlistModal) {
      this.btnOpenShortlistModal.addEventListener('click', () => {
        this.openShortlistModal();
      });
    }

    if (this.closeShortlistModalBtn) {
      this.closeShortlistModalBtn.addEventListener('click', () => {
        if (this.shortlistModal) this.shortlistModal.style.display = 'none';
      });
    }

    if (this.cancelShortlistBtn) {
      this.cancelShortlistBtn.addEventListener('click', () => {
        if (this.shortlistModal) this.shortlistModal.style.display = 'none';
      });
    }

    if (this.shortlistForm) {
      this.shortlistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const contact = document.getElementById('shortlistContact')?.value || '';
        const venue = document.getElementById('shortlistVenue')?.value || 'Shortlisted Venue';
        const caterer = document.getElementById('shortlistCaterer')?.value || 'Shortlisted Caterer';

        if (this.shortlistModal) this.shortlistModal.style.display = 'none';
        this.showToast(`🎉 Concierge request received for ${venue} & ${caterer}! We will contact ${contact} shortly.`);
      });
    }
  }

  openShortlistModal(selectedVenue = null, selectedCaterer = null) {
    const plan = this.currentPlan || {};
    const eventType = plan.eventSummary?.eventType || this.eventTypeSelect?.value || 'wedding';
    const locality = plan.eventSummary?.locality || this.localityInput?.value || 'Mumbai';
    const guests = plan.eventSummary?.guests || this.guestsInput?.value || 100;
    const budget = plan.eventSummary?.budget || this.budgetInput?.value || 500000;

    const eventTypeField = document.getElementById('shortlistEventType');
    const localityField = document.getElementById('shortlistLocality');
    const guestsField = document.getElementById('shortlistGuests');
    const budgetField = document.getElementById('shortlistBudget');
    const venueField = document.getElementById('shortlistVenue');
    const catererField = document.getElementById('shortlistCaterer');

    if (eventTypeField) eventTypeField.value = eventType.toUpperCase();
    if (localityField) localityField.value = locality;
    if (guestsField) guestsField.value = `${guests} Guests`;
    if (budgetField) budgetField.value = `₹${parseInt(budget, 10).toLocaleString('en-IN')}`;
    if (venueField && selectedVenue) venueField.value = selectedVenue;
    if (catererField && selectedCaterer) catererField.value = selectedCaterer;

    if (this.shortlistModal) this.shortlistModal.style.display = 'flex';
  }

  applyPreset(presetKey) {
    if (presetKey === 'wedding') {
      this.naturalPromptInput.value = "Grand intimate wedding reception for 150 guests in Juhu, ₹12,00,000 budget, royal marigold theme with live chaat and candid photography";
      this.eventTypeSelect.value = 'wedding';
      this.localityInput.value = 'Juhu, Mumbai';
      this.guestsInput.value = '150';
      this.guestsDisplay.textContent = '150';
      this.budgetInput.value = '1200000';
      this.budgetDisplay.textContent = '12,00,000';
    } else if (presetKey === 'birthday') {
      this.naturalPromptInput.value = "Superhero 6th birthday party for 35 kids in Powai, ₹45,000 budget, DIY slime counter, magician emcee and custom fondant cake";
      this.eventTypeSelect.value = 'birthday';
      this.localityInput.value = 'Powai, Mumbai';
      this.guestsInput.value = '35';
      this.guestsDisplay.textContent = '35';
      this.budgetInput.value = '45000';
      this.budgetDisplay.textContent = '45,000';
    } else if (presetKey === 'community') {
      this.naturalPromptInput.value = "Diwali society utsav & cultural gala for 200 residents in Thane, ₹1,00,000 budget, stage lighting, sound permissions and community buffet";
      this.eventTypeSelect.value = 'community';
      this.localityInput.value = 'Thane West';
      this.guestsInput.value = '200';
      this.guestsDisplay.textContent = '200';
      this.budgetInput.value = '100000';
      this.budgetDisplay.textContent = '1,00,000';
    }

    // Auto trigger generation for instant frictionless delight
    this.handleGeneratePlan();
  }

  async handleGeneratePlan() {
    let extractedType = this.eventTypeSelect.value;
    let guests = parseInt(this.guestsInput.value, 10) || 50;
    let budget = parseInt(this.budgetInput.value, 10) || 100000;
    let locality = this.localityInput.value.trim() || 'Mumbai';
    const rawPrompt = this.naturalPromptInput.value.trim();

    // If natural prompt was provided, parse any explicit parameters from it
    if (rawPrompt) {
      const lower = rawPrompt.toLowerCase();
      if (lower.includes('wedding') || lower.includes('shaadi') || lower.includes('sangeet') || lower.includes('reception')) {
        extractedType = 'wedding';
      } else if (lower.includes('society') || lower.includes('utsav') || lower.includes('festival') || lower.includes('community') || lower.includes('diwali') || lower.includes('ganesh')) {
        extractedType = 'community';
      } else if (lower.includes('birthday') || lower.includes('bday') || lower.includes('anniversary')) {
        extractedType = 'birthday';
      }

      const guestMatch = rawPrompt.match(/(\d+)\s*(guests?|people|kids|residents|members|pax)/i);
      if (guestMatch) {
        guests = parseInt(guestMatch[1], 10);
      }

      const budgetMatch = rawPrompt.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d+)?)\s*(lakh|lac|l|k|thousand)?\s*(?:budget)?/i);
      if (budgetMatch && budgetMatch[1]) {
        let b = parseFloat(budgetMatch[1].replace(/,/g, ''));
        const unit = (budgetMatch[2] || '').toLowerCase();
        if (unit === 'lakh' || unit === 'lac' || unit === 'l') b *= 100000;
        else if (unit === 'k' || unit === 'thousand') b *= 1000;
        if (b >= 5000) budget = Math.round(b);
      }

      const locMatch = rawPrompt.match(/(?:in|at)\s+([A-Za-z\s]+?)(?:,|\s+with|\s+for|$)/i);
      if (locMatch && locMatch[1].length > 2 && !['a', 'an', 'the', 'our', 'my'].includes(locMatch[1].trim().toLowerCase())) {
        locality = locMatch[1].trim();
      }
    }

    // Gather 3-level priorities from UI state
    const nonNegotiable = [];
    const important = [];
    const flexible = [];

    for (const [key, state] of Object.entries(this.prioritiesState)) {
      if (state.selected) {
        if (state.level === 'nonNegotiable') nonNegotiable.push(key);
        else if (state.level === 'flexible') flexible.push(key);
        else important.push(key);
      }
    }

    // Personalized Ideas / Special Touches
    const customIdeas = this.customIdeasInput ? this.customIdeasInput.value.trim() : '';

    // Treat anything user types in personalized ideas as Important unless they say must
    if (customIdeas) {
      const ciLower = customIdeas.toLowerCase();
      if (ciLower.includes('must') || ciLower.includes('non-negotiable') || ciLower.includes('mandatory') || ciLower.includes('essential')) {
        nonNegotiable.push(customIdeas.slice(0, 35));
      } else {
        important.push(customIdeas.slice(0, 35));
      }
    }

    // Selected priority preferences summary for backward prompt support
    const allPrioStrings = [];
    if (nonNegotiable.length > 0) allPrioStrings.push(`Must-haves: ${nonNegotiable.join(', ')}`);
    if (important.length > 0) allPrioStrings.push(`Important: ${important.join(', ')}`);
    if (flexible.length > 0) allPrioStrings.push(`Flexible: ${flexible.join(', ')}`);

    // Build the final prompt for the GenAI runtime
    const typeNames = {
      birthday: 'Birthday Celebration',
      wedding: 'Grand Wedding & Sangeet Celebration',
      community: 'Community Festival & Society Gala'
    };
    let finalPrompt = rawPrompt;
    if (!finalPrompt) {
      finalPrompt = `${typeNames[extractedType] || 'Event'} for ${guests} guests in ${locality} with a budget of ₹${budget.toLocaleString('en-IN')}`;
      if (allPrioStrings.length > 0) {
        finalPrompt += `. Priorities: ${allPrioStrings.join(' | ')}`;
      }
      if (customIdeas) {
        finalPrompt += `. Personalized touches / ideas to incorporate: "${customIdeas}"`;
      }
    } else {
      if (allPrioStrings.length > 0) {
        finalPrompt += ` (Priorities: ${allPrioStrings.join(' | ')})`;
      }
      if (customIdeas) {
        finalPrompt += ` (Personalized touches: "${customIdeas}")`;
      }
    }

    // Transition to loading stage
    this.intakeSection.style.display = 'none';
    this.dashboardSection.style.display = 'none';
    this.aiLoadingStage.style.display = 'block';

    // Simulated streaming pipeline steps for visual feedback
    this.animateLoadingSteps();

    try {
      const response = await fetch('/api/plan-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': this.apiKey
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          eventType: extractedType,
          guests: guests,
          guestCount: guests,
          budget: budget,
          totalBudget: budget,
          perGuestBudget: Math.round(budget / Math.max(guests, 1)),
          locality: locality,
          priorities: {
            nonNegotiable,
            important,
            flexible
          },
          customIdeas: customIdeas,
          apiKey: this.apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.plan) {
        this.currentPlan = data.plan;
        localStorage.setItem('auraplan_saved_plan', JSON.stringify(this.currentPlan));
        
        // Small delay to let user see final step complete
        setTimeout(() => {
          this.renderCompletePlan(this.currentPlan, data.engine);
        }, 600);
      } else {
        throw new Error(data.error || 'Failed to synthesize plan');
      }
    } catch (err) {
      console.error('Error generating plan:', err);
      alert('Unable to generate plan: ' + err.message);
      this.aiLoadingStage.style.display = 'none';
      this.intakeSection.style.display = 'block';
    }
  }

  animateLoadingSteps() {
    const steps = [
      { title: 'Deconstructing Event Vision...', desc: 'Analyzing locality constraints and per-guest parameters.', stepId: 'pipeStep1' },
      { title: 'Dynamic Budget Optimization...', desc: 'Balancing venue, catering & entertainment with tradeoff reasoning.', stepId: 'pipeStep2' },
      { title: 'Synthesizing Dual Timelines...', desc: 'Formulating prep countdown & hour-by-hour operational run of show.', stepId: 'pipeStep3' },
      { title: 'Grounding Local Mumbai Vendors...', desc: 'Curating verified suppliers and generating pre-drafted WhatsApp RFPs.', stepId: 'pipeStep4' },
      { title: 'Formulating Bespoke Ideas...', desc: 'Finalizing theme aesthetic, curated menu & WhatsApp invite copy.', stepId: 'pipeStep5' }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current >= steps.length) {
        clearInterval(interval);
        return;
      }
      const s = steps[current];
      this.loadingStepTitle.textContent = s.title;
      this.loadingStepDesc.textContent = s.desc;

      document.querySelectorAll('.pipeline-step').forEach((el, idx) => {
        if (idx < current) {
          el.className = 'pipeline-step completed';
        } else if (idx === current) {
          el.className = 'pipeline-step active';
        } else {
          el.className = 'pipeline-step';
        }
      });
      current++;
    }, 450);
  }

  renderCompletePlan(plan, engineName = 'gemini') {
    this.aiLoadingStage.style.display = 'none';
    this.intakeSection.style.display = 'none';
    this.dashboardSection.style.display = 'block';
    if (this.exportPdfBtn) this.exportPdfBtn.style.display = 'inline-flex';

    // Event Summary
    const summary = plan.eventSummary || {};

    // Update Clean Editorial Workspace Header
    if (this.planEventKicker) {
      const typeLabels = { wedding: 'WEDDING', birthday: 'BIRTHDAY CELEBRATION', community: 'COMMUNITY EVENT' };
      const eventLabel = typeLabels[summary.eventType] || 'CELEBRATION';
      const locLabel = (summary.locality || 'MUMBAI').toUpperCase();
      this.planEventKicker.textContent = `${eventLabel} • ${locLabel}`;
    }

    if (this.planEventTitle) {
      this.planEventTitle.textContent = summary.title || 'Curated Event Plan';
    }

    if (this.planEventMeta) {
      const budgetFormatted = summary.budget ? '₹' + summary.budget.toLocaleString('en-IN') : '₹1,00,000';
      const guestsFormatted = summary.guests ? `${summary.guests} Guests` : '';
      const localityFormatted = summary.locality || 'Mumbai';
      this.planEventMeta.textContent = `${guestsFormatted} • ${budgetFormatted} Budget • Grounded in ${localityFormatted}`;
    }

    // Safely update legacy KPI/badges if present
    if (this.planEventSummary) this.planEventSummary.textContent = summary.summaryParagraph || '';
    if (this.badgeEventType) {
      const eventTypeIcons = { wedding: '💍 Wedding', birthday: '🎂 Birthday', community: '🎪 Community Festival' };
      this.badgeEventType.textContent = eventTypeIcons[summary.eventType] || '🎉 Event';
    }
    if (this.badgeLocality) this.badgeLocality.textContent = `📍 ${summary.locality}`;
    if (this.badgeEngine) this.badgeEngine.textContent = engineName === 'gemini' ? '⚡ Gemini 2.5 Flash' : '⚡ Local Grounding Synthesizer';
    if (this.kpiTotalBudget) this.kpiTotalBudget.textContent = '₹' + (summary.budget || 0).toLocaleString('en-IN');
    if (this.kpiProjectedSub) this.kpiProjectedSub.textContent = `Projected: ₹${(plan.budget?.projectedSpend || summary.budget || 0).toLocaleString('en-IN')}`;
    if (this.kpiGuests) this.kpiGuests.textContent = `${summary.guests || 50} Guests`;
    if (this.kpiPerGuest) this.kpiPerGuest.textContent = `₹${(summary.perGuestCost || Math.round((summary.budget || 100000) / (summary.guests || 50))).toLocaleString('en-IN')}`;
    if (this.kpiVibe) this.kpiVibe.textContent = summary.vibe || '';

    // Synchronize What-if Sliders in Quadrant 1 (if present)
    if (this.tweakGuestsSlider) {
      this.tweakGuestsSlider.value = summary.guests || 50;
      if (this.tweakGuestsVal) this.tweakGuestsVal.textContent = summary.guests || 50;
    }
    if (this.tweakBudgetSlider) {
      this.tweakBudgetSlider.value = summary.budget || 100000;
      if (this.tweakBudgetVal) this.tweakBudgetVal.textContent = '₹' + (summary.budget || 100000).toLocaleString('en-IN');
    }

    // Render 4 Quadrants
    this.renderBudgetQuadrant(plan.budget || {});
    this.renderTimelineQuadrant(plan.timeline || {});
    this.renderVendorQuadrant(plan.vendorChecklist || {});
    this.renderIdeasQuadrant(plan.personalizedIdeas || {});

    // Scroll smoothly to workspace dashboard
    this.dashboardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  renderBudgetQuadrant(budget) {
    if (this.tradeoffText) {
      this.tradeoffText.innerHTML = `<strong>AI Tradeoff & Optimization Note:</strong> ${this.escapeHtml(budget.tradeoffAdvice || "Categories are balanced according to event archetype and guest volume.")}`;
    }

    if (this.budgetTotalPill) {
      this.budgetTotalPill.textContent = `Total: ₹${(budget.totalBudget || 100000).toLocaleString('en-IN')}`;
    }

    // 1. Budget Reality Check Banner
    const check = budget.budgetCheck || { status: 'fits', shortfall: 0, options: [] };
    if (this.budgetRealityCheckBanner) {
      if (check.status === 'short' || check.status === 'tight') {
        this.budgetRealityCheckBanner.style.display = 'block';
        const isShort = check.status === 'short';
        this.budgetRealityCheckBanner.className = `budget-reality-banner ${isShort ? 'banner-short' : 'banner-tight'}`;
        this.budgetRealityCheckBanner.innerHTML = `
          <div class="banner-top">
            <span class="banner-icon">${isShort ? '🚨' : '⚠️'}</span>
            <div>
              <h4 class="banner-title">${isShort ? 'Budget Reality Check: Shortfall Detected' : 'Budget Alert: Tight Allocation'}</h4>
              <p class="banner-desc">
                ${isShort 
                  ? `Your 🔒 Non-negotiables alone exceed your current budget by <strong>₹${(check.shortfall || 0).toLocaleString('en-IN')}</strong>. We never silently downgrade must-haves.`
                  : `Your budget is tight to comfortably cover standard market rates for all categories. Here is how you can resolve it:`}
              </p>
            </div>
          </div>
          ${check.options && check.options.length > 0 ? `
            <div class="banner-options">
              <span class="options-label">Actionable Options to Resolve:</span>
              <ul>
                ${check.options.map(opt => `<li>👉 ${this.escapeHtml(opt)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        `;
      } else {
        this.budgetRealityCheckBanner.style.display = 'none';
      }
    }

    // 2. Protected For You Card
    const protectedList = budget.protectedItems || [];
    if (this.protectedItemsCard) {
      if (protectedList.length > 0) {
        this.protectedItemsCard.style.display = 'block';
        this.protectedItemsCard.innerHTML = `
          <div class="protected-header">
            <div class="protected-badge">🔒 PROTECTED FOR YOU</div>
            <h4 class="protected-title">Non-Negotiables Locked at Top Quality</h4>
            <p class="protected-subtitle">These line items received first priority at premium quality and were never downgraded silently to fit the numbers.</p>
          </div>
          <div class="protected-grid">
            ${protectedList.map(item => `
              <div class="protected-item-pill">
                <span class="protected-dot"></span>
                <div class="protected-meta">
                  <span class="protected-name">${this.escapeHtml(item.category || item.name)}</span>
                  <span class="protected-amount">₹${(item.amount || item.allocatedAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <span class="tier-pill tier-premium">${this.escapeHtml(item.tier || 'Premium')} Tier</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        this.protectedItemsCard.style.display = 'none';
      }
    }

    // 3. Breakdown Table
    const lineItems = budget.lineItems || budget.categories || [];
    if (this.budgetTableBody) {
      let rowsHtml = '';
      lineItems.forEach(item => {
        const catName = item.category || item.name;
        const amt = item.amount || item.allocatedAmount || 0;
        const pct = item.percentOfBudget || item.percentage || Math.round((amt / (budget.totalBudget || 1)) * 100);
        const prio = item.priority || 'important';
        const tier = item.qualityTier || 'Standard';
        const reason = item.reason || item.notes || '';

        const prioBadge = prio === 'nonNegotiable'
          ? '<span class="prio-tag prio-must">🔒 Must-have</span>'
          : (prio === 'flexible'
            ? '<span class="prio-tag prio-flex">💸 Flexible</span>'
            : '<span class="prio-tag prio-imp">⭐ Important</span>');

        const tierBadge = `<span class="tier-badge tier-${tier.toLowerCase()}">${tier}</span>`;

        rowsHtml += `
          <tr>
            <td><strong class="table-cat-name">${this.escapeHtml(catName)}</strong></td>
            <td>${prioBadge}</td>
            <td>${tierBadge}</td>
            <td class="amount-cell">₹${amt.toLocaleString('en-IN')}</td>
            <td>
              <div class="table-pct-wrap">
                <div class="table-pct-bar"><div class="table-pct-fill" style="width: ${Math.min(pct, 100)}%;"></div></div>
                <span>${pct}%</span>
              </div>
            </td>
            <td class="table-reason-cell">${this.escapeHtml(reason)}</td>
          </tr>
        `;
      });
      this.budgetTableBody.innerHTML = rowsHtml;
    }

    // 4. What We Trimmed & Why Card
    const tradeOffs = budget.tradeOffs || [];
    if (this.tradeoffsCard && this.tradeoffsList) {
      if (tradeOffs.length > 0) {
        this.tradeoffsCard.style.display = 'block';
        this.tradeoffsList.innerHTML = tradeOffs.map(to => `
          <div class="insight-item">
            <div class="insight-item-header">
              <strong>${this.escapeHtml(to.item)}</strong>
              ${to.reducedBy ? `<span class="saved-tag">Conserved ~₹${to.reducedBy.toLocaleString('en-IN')}</span>` : ''}
            </div>
            <p class="insight-item-desc">${this.escapeHtml(to.why)}</p>
          </div>
        `).join('');
      } else {
        this.tradeoffsCard.style.display = 'none';
      }
    }

    // 5. Upgrades If Extra
    const upgrades = budget.upgradesIfExtra || [];
    if (this.upgradesCard && this.upgradesList) {
      if (upgrades.length > 0) {
        this.upgradesCard.style.display = 'block';
        this.upgradesList.innerHTML = upgrades.map(up => `
          <div class="insight-item upgrade-item">
            <span class="upgrade-bullet">✨</span>
            <p class="insight-item-desc">${this.escapeHtml(up)}</p>
          </div>
        `).join('');
      } else {
        this.upgradesCard.style.display = 'none';
      }
    }
  }

  renderTimelineQuadrant(timeline) {
    // Prep Countdown Roadmap
    let countdownHtml = '';
    const phases = timeline.prepCountdown || [];
    phases.forEach((phase, pIdx) => {
      countdownHtml += `
        <div class="prep-phase-block">
          <div class="prep-phase-header">
            <h4 class="phase-title">${this.escapeHtml(phase.phase)}</h4>
            <span class="phase-time">${this.escapeHtml(phase.timeBefore)}</span>
          </div>
          <div class="phase-tasks-list">
      `;

      (phase.tasks || []).forEach((t, tIdx) => {
        countdownHtml += `
          <div class="task-item" id="task-${pIdx}-${tIdx}">
            <input type="checkbox" class="task-checkbox" data-pidx="${pIdx}" data-tidx="${tIdx}">
            <div class="task-content">
              <div class="task-title">${this.escapeHtml(t.task)}</div>
              <div class="task-tip">💡 ${this.escapeHtml(t.tips || '')}</div>
            </div>
          </div>
        `;
      });

      countdownHtml += `</div></div>`;
    });
    this.prepPhasesList.innerHTML = countdownHtml;

    // Attach checkbox listeners
    this.prepPhasesList.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const item = e.target.closest('.task-item');
        if (e.target.checked) {
          item.classList.add('completed');
        } else {
          item.classList.remove('completed');
        }
      });
    });

    // Run of Show
    let rosHtml = '';
    const ros = timeline.runOfShow || [];
    ros.forEach(item => {
      rosHtml += `
        <div class="ros-item">
          <div class="ros-time">${this.escapeHtml(item.time)}</div>
          <div class="ros-body">
            <div class="ros-phase">${this.escapeHtml(item.phase)}</div>
            <div class="ros-activity">${this.escapeHtml(item.activity)}</div>
            <div class="ros-meta">
              <span>Lead: <strong class="ros-party">${this.escapeHtml(item.responsibleParty)}</strong></span>
              <span>Note: ${this.escapeHtml(item.criticalNotes || '')}</span>
            </div>
          </div>
        </div>
      `;
    });
    this.runOfShowList.innerHTML = rosHtml;
  }

  renderVendorQuadrant(vendorChecklist) {
    const plan = this.currentPlan || {};
    const locality = plan.eventSummary?.locality || this.localityInput?.value || 'Mumbai';

    // Section A: Find Your Venue
    const venues = plan.featuredVenues || vendorChecklist.featuredVenues || [];
    if (this.featuredVenuesGrid) {
      if (venues.length === 0) {
        this.featuredVenuesGrid.innerHTML = `
          <div class="empty-vendor-box">
            <p>No verified venues found directly matching exact parameters in ${this.escapeHtml(locality)}.</p>
          </div>
        `;
        if (this.venueExternalSearchBtn) {
          this.venueExternalSearchBtn.style.display = 'inline-flex';
          this.venueExternalSearchBtn.href = `https://www.google.com/maps/search/?api=1&query=party+halls+in+${encodeURIComponent(locality)}+Mumbai`;
        }
      } else {
        let vHtml = '';
        venues.forEach(v => {
          const fitClass = v.budgetFit === 'Fits' ? 'fit-good' : (v.budgetFit === 'Stretch' ? 'fit-stretch' : 'fit-over');
          const fitLabel = v.budgetFit === 'Fits' ? '✓ Fits your budget' : (v.budgetFit === 'Stretch' ? '⚠️ Slight stretch' : 'Above allocation');

          vHtml += `
            <div class="venue-card" data-venue-name="${this.escapeHtml(v.name)}">
              <div class="venue-card-header">
                <div>
                  <span class="venue-type-tag">${this.escapeHtml(v.type || 'Banquet Hall')}</span>
                  ${v.isNearby ? `<span class="nearby-tag">${this.escapeHtml(v.distanceLabel || 'Nearby')}</span>` : ''}
                  <h4 class="venue-name">${this.escapeHtml(v.name)}</h4>
                  <p class="venue-locality">📍 ${this.escapeHtml(v.locality)}, Mumbai</p>
                </div>
                <span class="fit-tag ${fitClass}">${fitLabel}</span>
              </div>

              <div class="venue-specs-row">
                <div class="venue-spec">
                  <span class="spec-label">Capacity</span>
                  <span class="spec-val">👥 ${v.capacityMin} - ${v.capacityMax}</span>
                </div>
                <div class="venue-spec">
                  <span class="spec-label">Approx. Price</span>
                  <span class="spec-val">💰 ~₹${v.approxPricePerEvent.toLocaleString('en-IN')}</span>
                </div>
                <div class="venue-spec">
                  <span class="spec-label">Dietary Purity</span>
                  <span class="spec-val">${v.vegJainFriendly ? '🌿 Pure Veg & Jain Friendly' : 'Confirm with venue'}</span>
                </div>
              </div>

              <p class="venue-why-fits">${this.escapeHtml(v.whyItFits)}</p>

              <div class="must-ask-box">
                <span class="must-ask-icon">❓</span>
                <div>
                  <strong>Must-Ask Question:</strong>
                  <p>${this.escapeHtml(v.mustAskQuestion)}</p>
                </div>
              </div>

              <div class="venue-actions-row">
                ${v.phone ? `<a href="tel:${v.phone}" class="btn btn-outline-gold btn-sm">📞 Call</a>` : ''}
                ${v.website ? `<a href="${v.website}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">🌐 Website</a>` : ''}
                <a href="${v.mapsLink}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">📍 View on Maps</a>
                <button type="button" class="btn btn-gold btn-sm btn-select-venue-shortlist" data-venue="${this.escapeHtml(v.name)}">
                  Select for Shortlist
                </button>
              </div>
            </div>
          `;
        });
        this.featuredVenuesGrid.innerHTML = vHtml;

        this.featuredVenuesGrid.querySelectorAll('.btn-select-venue-shortlist').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const vName = e.currentTarget.dataset.venue;
            this.openShortlistModal(vName, null);
          });
        });
      }
    }

    // Section B: Catering We Recommend
    const cateringData = plan.featuredCatering || vendorChecklist.featuredCatering || {};
    const caterers = cateringData.caterers || [];
    if (this.cateringWhyTheseTwo && cateringData.whyTheseTwo) {
      this.cateringWhyTheseTwo.textContent = cateringData.whyTheseTwo;
    }

    if (this.featuredCateringGrid) {
      let cHtml = '';
      caterers.forEach(c => {
        const fitClass = c.budgetFit === 'Fits your budget' ? 'fit-good' : (c.budgetFit === 'Slight stretch' ? 'fit-stretch' : 'fit-over');

        cHtml += `
          <div class="caterer-card" data-caterer-name="${this.escapeHtml(c.name)}">
            <div class="caterer-header">
              <div>
                <span class="pan-mumbai-badge">🌟 Serves All Mumbai</span>
                <h4 class="caterer-name">${this.escapeHtml(c.name)}</h4>
                <p class="caterer-cuisine">${this.escapeHtml(c.cuisineStyle)}</p>
              </div>
              <span class="fit-tag ${fitClass}">${this.escapeHtml(c.budgetFit)}</span>
            </div>

            <div class="caterer-meta-row">
              <div class="caterer-meta-col">
                <span class="meta-label">Approx Per-Plate</span>
                <span class="meta-val">₹${c.approxPerPlateMin} - ₹${c.approxPerPlateMax}</span>
              </div>
              <div class="caterer-meta-col">
                <span class="meta-label">Min. Guests</span>
                <span class="meta-val">👥 ${c.minGuests} Guests</span>
              </div>
              <div class="caterer-meta-col">
                <span class="meta-label">Dietary Purity</span>
                <span class="meta-val">${c.pureVegOnly ? '🌿 100% Pure Veg' : 'Non-Veg & Veg (Jain on req)'}</span>
              </div>
            </div>

            <div class="caterer-jain-badge">
              <span>${this.escapeHtml(c.jainAvailability || 'Confirm with caterer')}</span>
            </div>

            <p class="caterer-verdict-reason">💡 <strong>Budget Verdict:</strong> ${this.escapeHtml(c.budgetFitReason)}</p>
            <p class="caterer-why-featured">${this.escapeHtml(c.whyFeatured)}</p>

            <div class="caterer-actions">
              ${c.phone ? `<a href="tel:${c.phone}" class="btn btn-outline-gold btn-sm">📞 Call</a>` : ''}
              ${c.website ? `<a href="${c.website}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">🌐 Website</a>` : ''}
              <button type="button" class="btn btn-gold btn-sm btn-enquire-caterer" data-caterer="${this.escapeHtml(c.name)}">
                <span>Enquire & Shortlist</span>
              </button>
            </div>
          </div>
        `;
      });
      this.featuredCateringGrid.innerHTML = cHtml;

      this.featuredCateringGrid.querySelectorAll('.btn-enquire-caterer').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const cName = e.currentTarget.dataset.caterer;
          this.openShortlistModal(null, cName);
        });
      });
    }

    // Render Category Sourced Specialists
    let html = '';
    const categories = vendorChecklist.categories || [];

    categories.forEach((cat) => {
      html += `
        <div class="vendor-category-block">
          <h4 class="vendor-cat-title">
            <span>🏷️</span>
            <span>${this.escapeHtml(cat.categoryName)}</span>
          </h4>

          <div class="vendor-criteria-grid">
            <div>
              <div class="criteria-title">🎯 Concrete Hiring Criteria</div>
              <ul class="criteria-list">
                ${(cat.hiringCriteria || []).map(c => `<li>${this.escapeHtml(c)}</li>`).join('')}
              </ul>
            </div>
            <div>
              <div class="criteria-title">❓ Must-Ask Interview Questions</div>
              <ul class="criteria-list">
                ${(cat.mustAskQuestions || []).map(q => `<li>${this.escapeHtml(q)}</li>`).join('')}
              </ul>
            </div>
          </div>

          <div class="grounded-vendors-grid">
            ${(cat.recommendations || []).map(v => `
              <div class="grounded-vendor-card">
                <div>
                  <div class="gv-header">
                    <span class="gv-name">${this.escapeHtml(v.name)}</span>
                    <span class="gv-tier">${this.escapeHtml(v.priceTier || 'Verified')}</span>
                  </div>
                  <div class="gv-suburb">📍 ${this.escapeHtml(v.area || 'Mumbai')}</div>
                  <div class="gv-specialty">⭐ ${this.escapeHtml(v.specialty || '')}</div>
                  <div class="gv-why">"${this.escapeHtml(v.whyChosen || '')}"</div>
                </div>
                <div class="gv-contact">
                  <span class="gv-phone">📞 ${this.escapeHtml(v.phone || 'Available on request')}</span>
                  <a href="tel:${v.phone || ''}" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;">Call</a>
                </div>
              </div>
            `).join('')}
          </div>

          ${cat.rfpDraft ? `
            <div class="rfp-box">
              <div class="rfp-header">
                <span class="rfp-title">💬 1-Click WhatsApp RFP Message</span>
                <button class="btn btn-secondary btn-sm btn-copy-rfp" data-rfp="${encodeURIComponent(cat.rfpDraft)}">
                  <span>Copy RFP</span>
                </button>
              </div>
              <pre class="rfp-text">${this.escapeHtml(cat.rfpDraft)}</pre>
            </div>
          ` : ''}
        </div>
      `;
    });

    if (this.vendorCategoriesList) {
      this.vendorCategoriesList.innerHTML = html;

      this.vendorCategoriesList.querySelectorAll('.btn-copy-rfp').forEach(btn => {
        btn.addEventListener('click', () => {
          const text = decodeURIComponent(btn.dataset.rfp);
          navigator.clipboard.writeText(text);
          this.showToast('📋 WhatsApp inquiry copied to clipboard!');
        });
      });
    }
  }

  renderIdeasQuadrant(ideas) {
    // Theme & Palette
    const theme = ideas.theme || {};
    this.themeTitle.textContent = theme.title || 'Bespoke Celebration';
    this.themeVisualVibe.textContent = theme.visualVibe || 'Elegance & Style';
    this.themeDescription.textContent = theme.description || 'Personalized decor scheme.';

    let swatchesHtml = '';
    (theme.colorPalette || []).forEach(color => {
      swatchesHtml += `
        <div class="swatch-chip" data-hex="${color.hex}" title="Click to copy ${color.hex}">
          <span class="swatch-color" style="background-color: ${color.hex};"></span>
          <span class="swatch-name">${this.escapeHtml(color.name)} (${color.hex})</span>
        </div>
      `;
    });
    this.paletteSwatchesList.innerHTML = swatchesHtml;

    // Attach swatch click listeners
    this.paletteSwatchesList.querySelectorAll('.swatch-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const hex = chip.dataset.hex;
        navigator.clipboard.writeText(hex);
        this.showToast(`Copied color ${hex} to clipboard!`);
      });
    });

    // WhatsApp Invite
    this.inviteCopyText.textContent = ideas.whatsappInviteCopy || 'No invite text generated.';

    // Activities
    let actHtml = '';
    (ideas.activities || []).forEach(act => {
      actHtml += `
        <div class="activity-item">
          <div class="activity-item-title">✨ ${this.escapeHtml(act.title)}</div>
          <div class="activity-item-concept">${this.escapeHtml(act.concept)}</div>
          <div class="activity-item-meta">
            <span>👥 <strong>Target:</strong> ${this.escapeHtml(act.targetAudience || 'All')}</span> | 
            <span>📦 <strong>Kit:</strong> ${this.escapeHtml(act.materialsNeeded || 'Standard')}</span>
          </div>
        </div>
      `;
    });
    this.activitiesList.innerHTML = actHtml;

    // Curated Menu
    let menuHtml = '';
    (ideas.curatedMenu || []).forEach(sec => {
      menuHtml += `
        <div class="menu-section-block">
          <div class="menu-section-title">${this.escapeHtml(sec.section)}</div>
          <ul class="menu-items-list">
            ${(sec.items || []).map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `;
    });
    this.menuSectionsList.innerHTML = menuHtml;
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    this.tabButtons.forEach(btn => {
      const match = btn.dataset.tab === tabId;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match);
    });

    this.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });
  }

  switchTimelineLayer(layer) {
    this.activeTimelineView = layer;
    if (layer === 'countdown') {
      this.viewCountdownBtn.classList.add('active');
      this.viewRunOfShowBtn.classList.remove('active');
      this.layerPrepCountdown.style.display = 'block';
      this.layerRunOfShow.style.display = 'none';
    } else {
      this.viewCountdownBtn.classList.remove('active');
      this.viewRunOfShowBtn.classList.add('active');
      this.layerPrepCountdown.style.display = 'none';
      this.layerRunOfShow.style.display = 'block';
    }
  }

  handleRecalculateBudget() {
    if (!this.currentPlan) return;
    const newGuests = parseInt(this.tweakGuestsSlider.value, 10);
    const newBudget = parseInt(this.tweakBudgetSlider.value, 10);

    const oldBudget = this.currentPlan.budget.totalBudget;
    const ratio = newBudget / Math.max(oldBudget, 1);

    this.currentPlan.budget.totalBudget = newBudget;
    this.currentPlan.budget.projectedSpend = newBudget;
    this.currentPlan.eventSummary.guests = newGuests;
    this.currentPlan.eventSummary.budget = newBudget;
    this.currentPlan.eventSummary.perGuestCost = Math.round(newBudget / Math.max(newGuests, 1));

    // Scale categories dynamically
    this.currentPlan.budget.categories.forEach(cat => {
      cat.allocatedAmount = Math.round(cat.allocatedAmount * ratio);
    });

    this.currentPlan.budget.tradeoffAdvice = `Recalculated for ${newGuests} guests at ₹${newBudget.toLocaleString('en-IN')}. Per-guest spend scaled to ₹${this.currentPlan.eventSummary.perGuestCost.toLocaleString('en-IN')}. Food and seating priorities adjusted.`;

    // Re-render
    this.renderCompletePlan(this.currentPlan, 'interactive-tweak');
    this.showToast('⚡ Dynamic budget re-calculated!');
  }

  async handleRefinement() {
    const text = this.refinementInput.value.trim();
    if (!text || !this.currentPlan) return;

    this.btnRefinePlan.disabled = true;
    this.btnRefinePlan.querySelector('.btn-text').textContent = 'Thinking...';

    try {
      const res = await fetch('/api/refine-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': this.apiKey
        },
        body: JSON.stringify({
          currentPlan: this.currentPlan,
          refinementPrompt: text,
          apiKey: this.apiKey
        })
      });

      if (!res.ok) throw new Error('Refinement failed');
      const data = await res.json();
      if (data.success && data.plan) {
        this.currentPlan = data.plan;
        localStorage.setItem('auraplan_saved_plan', JSON.stringify(this.currentPlan));
        this.renderCompletePlan(this.currentPlan, data.engine);
        this.refinementInput.value = '';
        this.showToast('✨ Plan updated with your custom instructions!');
      }
    } catch (err) {
      alert('Error updating plan: ' + err.message);
    } finally {
      this.btnRefinePlan.disabled = false;
      this.btnRefinePlan.querySelector('.btn-text').textContent = 'Update Plan';
    }
  }

  sharePlanSummary() {
    if (!this.currentPlan) return;
    const s = this.currentPlan.eventSummary;
    const msg = `🎉 *AuraPlan AI Event Brief: ${s.title}*\n\n` +
      `📍 Locality: ${s.locality}\n` +
      `👥 Headcount: ${s.guests} Guests\n` +
      `💰 Budget: ₹${s.budget.toLocaleString('en-IN')} (₹${s.perGuestCost}/guest)\n` +
      `🎨 Theme: ${this.currentPlan.personalizedIdeas?.theme?.title || 'Custom'}\n\n` +
      `Generated with AuraPlan AI-Native Event Architect!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  loadSavedPlan() {
    try {
      const saved = localStorage.getItem('auraplan_saved_plan');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.eventSummary) {
          this.currentPlan = parsed;
          // Plan retained in memory, but not auto-rendered on refresh
          // so the user always lands at the top homepage snippet.
        }
      }
    } catch (e) {
      console.warn('Could not load saved plan');
    }
  }

  resetToHomepage(instant = false) {
    // Hide dashboard workspace and loading stages
    if (this.dashboardSection) this.dashboardSection.style.display = 'none';
    if (this.aiLoadingStage) this.aiLoadingStage.style.display = 'none';

    // Show intake workspace
    if (this.intakeSection) this.intakeSection.style.display = 'block';

    // Hide header export button
    if (this.exportPdfBtn) this.exportPdfBtn.style.display = 'none';

    // Clear URL hash without reloading
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }

    // Prevent browser auto-restoring scroll position on refresh
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Scroll to the top snippet of the website
    if (instant) {
      window.scrollTo(0, 0);
      setTimeout(() => window.scrollTo(0, 0), 20);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }

  showToast(message) {
    this.toastMessage.textContent = message;
    this.toastNotification.style.display = 'block';
    setTimeout(() => {
      this.toastNotification.style.display = 'none';
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on DOMContentLoaded and enforce top homepage status
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AuraPlanApp();
});

window.addEventListener('load', () => {
  if (window.app) {
    window.app.resetToHomepage(true);
  }
});
