const TEMPLATES = {
  asg: {
    key: 'asg',
    name: 'ASG',
    label: 'AMPLIFY SOLUTIONS GROUP PTY LTD',
    company: 'AMPLIFY SOLUTIONS GROUP PTY LTD',
    abn: '43 663 126 725',
    address: '14C, 1 The Esplanade, Mount pleasant, 6153',
    phone: '08 6147 7927',
    email: 'Natalie@sjssolutionscorp.com.au',
  },
  sjs: {
    key: 'sjs',
    name: 'SJS',
    label: 'SJS WEALTH SOLUTIONS PTY LTD',
    company: 'SJS WEALTH SOLUTIONS PTY LTD',
    abn: '89 622 469 845',
    address: 'PO Box 3330, Beeliar Drive, Success WA 6964',
    phone: '',
    email: 'Natalie@sjssolutionscorp.com.au',
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
