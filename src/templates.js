const TEMPLATES = {
  asg: {
    key: 'asg',
    name: 'ASG',
    label: 'Amplify Solutions Group',
    company_name: 'Amplify Solutions Group',
    company_abn: '43 663 126 725',
    company_address: '14C, 1 The Esplanade, Mount pleasant, 6153',
    company_phone: '08 6147 7927',
    company_email: '',
  },
  sjs: {
    key: 'sjs',
    name: 'SJS',
    label: 'SJS Wealth Solutions',
    company_name: 'SJS WEALTH SOLUTIONS PTY LTD',
    company_abn: '89 622 469 845',
    company_address: '',
    company_phone: '',
    company_email: '',
  },
};

const WEEKLY_WAGE = {
  fullDays: 5,
  halfDays: 1,
  defaultTotal: 1000,
  get perDay() {
    return Math.round((WEEKLY_WAGE.defaultTotal / (WEEKLY_WAGE.fullDays + WEEKLY_WAGE.halfDays * 0.5)) * 100) / 100;
  },
  dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const WEEKLY_SEND_TO = 'Natalie@sjssolutionscorp.com.au';

function getTemplate(key) {
  return TEMPLATES[key] || TEMPLATES.asg;
}

module.exports = { TEMPLATES, WEEKLY_WAGE, WEEKLY_SEND_TO, getTemplate };
