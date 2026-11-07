import { addDays, monthKey, startOfDay, startOfWeekMonday, toDateInput } from '../lib/dates';

function documentPreview(label, name, idNumber) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440">
    <rect width="720" height="440" fill="#f1f5f9"/>
    <rect x="20" y="20" width="680" height="400" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="20" y="20" width="680" height="64" rx="10" fill="#102a43"/>
    <text x="44" y="58" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#ffffff">${label} (Demo Document)</text>
    <text x="48" y="130" font-family="Arial" font-size="14" fill="#64748b">NAME</text>
    <text x="48" y="158" font-family="Arial" font-size="22" fill="#0f172a">${name}</text>
    <text x="48" y="210" font-family="Arial" font-size="14" fill="#64748b">ID NUMBER</text>
    <text x="48" y="238" font-family="Arial" font-size="22" fill="#0f172a">${idNumber}</text>
    <text x="48" y="300" font-family="Arial" font-size="14" fill="#64748b">SAMPLE UPLOADED PROOF</text>
    <rect x="48" y="320" width="240" height="56" rx="6" fill="#e2e8f0"/>
    <text x="68" y="354" font-family="Arial" font-size="13" fill="#475569">Document preview placeholder</text>
  </svg>`;
  return {
    name: `${name.toLowerCase().replace(/\s+/g, '-')}-id-proof.svg`,
    type: 'image/svg+xml',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

export function createSeedDatabase(now = new Date()) {
  const today = startOfDay(now);
  const currentPeriod = monthKey(today);
  const previousPeriod = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const dayOfMonth = today.getDate();
  const clampDay = (value) => Math.min(28, Math.max(1, value));

  const at = (daysAgo, hours, minutes = 0) => {
    const date = addDays(today, -daysAgo);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  };
  const dateAgo = (days) => toDateInput(addDays(today, -days));

  const hostellers = [
    {
      id: 'hst-rahul',
      fullName: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul.sharma@example.com',
      joinDate: dateAgo(310),
      emergencyContact: 'Sunita Sharma (Mother) · 9812345670',
      idType: 'Aadhaar Card',
      idNumber: '4821 9930 1174',
      idProof: documentPreview('Aadhaar Card', 'Rahul Sharma', '4821 9930 1174'),
      roomNumber: '101',
      bedNumber: '1',
      monthlyRent: 6500,
      rentDueDay: clampDay(dayOfMonth + 2),
      washingMachine: { enabled: true, amount: 300, startDate: dateAgo(280) },
      username: 'rahul',
      password: 'rahul123',
      active: true,
      createdAt: at(310, 10),
    },
    {
      id: 'hst-priya',
      fullName: 'Priya Verma',
      phone: '9822334455',
      email: 'priya.verma@example.com',
      joinDate: dateAgo(240),
      emergencyContact: 'Anil Verma (Father) · 9900112233',
      idType: 'Passport',
      idNumber: 'P7384921',
      idProof: documentPreview('Passport', 'Priya Verma', 'P7384921'),
      roomNumber: '102',
      bedNumber: '2',
      monthlyRent: 7000,
      rentDueDay: clampDay(dayOfMonth),
      washingMachine: { enabled: true, amount: 250, startDate: dateAgo(200) },
      username: 'priya',
      password: 'priya123',
      active: true,
      createdAt: at(240, 11),
    },
    {
      id: 'hst-arjun',
      fullName: 'Arjun Mehta',
      phone: '9765432109',
      email: 'arjun.mehta@example.com',
      joinDate: dateAgo(420),
      emergencyContact: 'Rekha Mehta (Mother) · 9765001122',
      idType: 'Driving Licence',
      idNumber: 'MH-0120190012345',
      idProof: documentPreview('Driving Licence', 'Arjun Mehta', 'MH-0120190012345'),
      roomNumber: '103',
      bedNumber: '1',
      monthlyRent: 6000,
      rentDueDay: clampDay(dayOfMonth - 5),
      washingMachine: { enabled: false, amount: 0, startDate: '' },
      username: 'arjun',
      password: 'arjun123',
      active: true,
      createdAt: at(420, 9),
    },
    {
      id: 'hst-sneha',
      fullName: 'Sneha Iyer',
      phone: '9700112244',
      email: 'sneha.iyer@example.com',
      joinDate: dateAgo(180),
      emergencyContact: 'Lakshmi Iyer (Mother) · 9700556677',
      idType: 'Voter ID',
      idNumber: 'MH/04/123/456789',
      idProof: documentPreview('Voter ID', 'Sneha Iyer', 'MH/04/123/456789'),
      roomNumber: '201',
      bedNumber: '1',
      monthlyRent: 7500,
      rentDueDay: clampDay(Math.min(dayOfMonth + 9, 28)),
      washingMachine: { enabled: true, amount: 350, startDate: dateAgo(170) },
      username: 'sneha',
      password: 'sneha123',
      active: true,
      createdAt: at(180, 12),
    },
    {
      id: 'hst-vikram',
      fullName: 'Vikram Singh',
      phone: '9811223344',
      email: 'vikram.singh@example.com',
      joinDate: dateAgo(150),
      emergencyContact: 'Harpreet Singh (Brother) · 9811998877',
      idType: 'Aadhaar Card',
      idNumber: '9012 3345 6678',
      idProof: documentPreview('Aadhaar Card', 'Vikram Singh', '9012 3345 6678'),
      roomNumber: '201',
      bedNumber: '2',
      monthlyRent: 6500,
      rentDueDay: 15,
      washingMachine: { enabled: true, amount: 300, startDate: dateAgo(120) },
      username: 'vikram',
      password: 'vikram123',
      active: true,
      createdAt: at(150, 15),
    },
    {
      id: 'hst-karan',
      fullName: 'Karan Patel',
      phone: '9933221100',
      email: 'karan.patel@example.com',
      joinDate: dateAgo(95),
      emergencyContact: 'Nilesh Patel (Father) · 9933556677',
      idType: 'Aadhaar Card',
      idNumber: '7788 1122 3344',
      idProof: documentPreview('Aadhaar Card', 'Karan Patel', '7788 1122 3344'),
      roomNumber: '104',
      bedNumber: '1',
      monthlyRent: 6200,
      rentDueDay: 12,
      washingMachine: { enabled: false, amount: 0, startDate: '' },
      username: 'karan',
      password: 'karan123',
      active: true,
      createdAt: at(95, 10),
    },
    {
      id: 'hst-ananya',
      fullName: 'Ananya Das',
      phone: '9800765432',
      email: 'ananya.das@example.com',
      joinDate: dateAgo(500),
      emergencyContact: 'Sujata Das (Mother) · 9800443322',
      idType: 'Aadhaar Card',
      idNumber: '3344 5566 7788',
      idProof: documentPreview('Aadhaar Card', 'Ananya Das', '3344 5566 7788'),
      roomNumber: '202',
      bedNumber: '1',
      monthlyRent: 5500,
      rentDueDay: 20,
      washingMachine: { enabled: false, amount: 0, startDate: '' },
      username: 'ananya',
      password: 'ananya123',
      active: false,
      createdAt: at(500, 11),
      deactivatedAt: at(45, 16),
    },
  ];

  const advancePayments = hostellers.map((hosteller, index) => ({
    id: `adv-seed-${index + 1}`,
    hostellerId: hosteller.id,
    type: 'deposit',
    amount: [10000, 12000, 8000, 15000, 10000, 10000, 5000][index],
    date: new Date(`${hosteller.joinDate}T10:00:00`).toISOString(),
    method: 'Cash',
    reference: '',
    note: 'Security deposit collected at joining',
    createdAt: new Date(`${hosteller.joinDate}T10:00:00`).toISOString(),
  }));

  const payment = (index, hostellerId, amount, date, period, method, reference) => ({
    id: `rent-seed-${index}`,
    hostellerId,
    amount,
    date: new Date(`${date}T11:00:00`).toISOString(),
    period,
    method,
    reference,
    note: '',
    createdAt: new Date(`${date}T11:00:00`).toISOString(),
  });

  const previousMonthDay = (day) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 1, Math.min(day, 28));
    return toDateInput(date);
  };

  const rentPayments = [
    payment(1, 'hst-rahul', 6500, previousMonthDay(5), previousPeriod, 'UPI', 'UPI/4456732'),
    payment(2, 'hst-rahul', 3000, dateAgo(1), currentPeriod, 'UPI', 'UPI/9981123'),
    payment(3, 'hst-priya', 7000, previousMonthDay(10), previousPeriod, 'Cash', ''),
    payment(4, 'hst-arjun', 6000, previousMonthDay(10), previousPeriod, 'Bank Transfer', 'NEFT/550193'),
    payment(5, 'hst-sneha', 7500, dateAgo(1), currentPeriod, 'UPI', 'UPI/7712340'),
    payment(6, 'hst-sneha', 7500, previousMonthDay(10), previousPeriod, 'UPI', 'UPI/6612904'),
    payment(7, 'hst-vikram', 3000, dateAgo(6), currentPeriod, 'Paytm', 'PTM/8891002'),
    payment(8, 'hst-vikram', 6500, previousMonthDay(15), previousPeriod, 'Paytm', 'PTM/7712345'),
    payment(9, 'hst-karan', 6200, dateAgo(3), currentPeriod, 'Bank Transfer', 'NEFT/993210'),
    payment(10, 'hst-karan', 6200, previousMonthDay(12), previousPeriod, 'Bank Transfer', 'NEFT/887654'),
    payment(11, 'hst-ananya', 5500, previousMonthDay(20), previousPeriod, 'Cash', ''),
    payment(12, 'hst-ananya', 5500, previousMonthDay(50), monthKey(new Date(today.getFullYear(), today.getMonth() - 2, 1)), 'Cash', ''),
  ];

  const outing = (index, hostellerId, outDaysAgo, outHour, outMinute, inDaysAgo, inHour, inMinute, lat, lng) => {
    const outAt = at(outDaysAgo, outHour, outMinute);
    const inAt = inDaysAgo === null ? null : at(inDaysAgo, inHour, inMinute);
    return {
      id: `out-seed-${index}`,
      hostellerId,
      outAt,
      outLat: lat,
      outLng: lng,
      outAccuracy: 18,
      inAt,
      durationMs: inAt ? new Date(inAt).getTime() - new Date(outAt).getTime() : null,
      createdAt: outAt,
    };
  };

  const outings = [
    outing(1, 'hst-karan', 0, 10, 30, null, 0, 0, 19.1176, 72.906),
    outing(2, 'hst-rahul', 1, 18, 0, 1, 20, 30, 19.076, 72.8777),
    outing(3, 'hst-priya', 2, 17, 30, 2, 19, 0, 19.2183, 72.9781),
    outing(4, 'hst-arjun', 1, 8, 0, 1, 10, 15, 19.0176, 72.8562),
    outing(5, 'hst-rahul', 4, 9, 0, 4, 11, 15, 19.1075, 72.8263),
    outing(6, 'hst-sneha', 5, 16, 45, 5, 18, 10, 19.033, 72.861),
  ];

  const menuFor = (index) => {
    const menu = [
      ['Poha & Tea', 'Dal, Rice, Roti & Salad', 'Paneer Curry, Roti & Rice'],
      ['Idli, Sambar & Chutney', 'Rajma, Rice & Roti', 'Aloo Gobi, Roti & Kheer'],
      ['Aloo Paratha & Curd', 'Chole, Rice & Roti', 'Veg Pulao, Raita & Roti'],
      ['Upma & Banana', 'Kadhi, Rice & Roti', 'Mix Veg, Roti & Salad'],
      ['Puri Bhaji', 'Dal Fry, Rice & Roti', 'Chicken/Veg Curry, Roti & Rice'],
      ['Masala Dosa & Chutney', 'Veg Biryani & Raita', 'Noodles & Manchurian'],
      ['Bread Omelette / Veg Sandwich', 'Dal, Rice, Roti & Papad', 'Pav Bhaji & Salad'],
    ];
    const [breakfast, lunch, dinner] = menu[index % 7];
    return { breakfast, lunch, dinner };
  };

  const buildPollDays = (weekStartDate) =>
    Array.from({ length: 7 }, (_, index) => ({
      date: toDateInput(addDays(weekStartDate, index)),
      ...menuFor(index),
    }));

  const thisWeekStart = startOfWeekMonday(today);
  const previousWeekStart = addDays(thisWeekStart, -7);
  const deadline = new Date(addDays(today, 1));
  deadline.setHours(18, 0, 0, 0);
  const previousDeadline = new Date(addDays(thisWeekStart, -1));
  previousDeadline.setHours(18, 0, 0, 0);

  const foodPolls = [
    {
      id: 'poll-current',
      weekStart: toDateInput(thisWeekStart),
      weekEnd: toDateInput(addDays(thisWeekStart, 6)),
      days: buildPollDays(thisWeekStart),
      deadline: deadline.toISOString(),
      status: 'open',
      createdAt: at(2, 9),
      closedAt: null,
    },
    {
      id: 'poll-previous',
      weekStart: toDateInput(previousWeekStart),
      weekEnd: toDateInput(addDays(previousWeekStart, 6)),
      days: buildPollDays(previousWeekStart),
      deadline: previousDeadline.toISOString(),
      status: 'closed',
      createdAt: at(9, 9),
      closedAt: previousDeadline.toISOString(),
    },
  ];

  const selectionDays = (poll, pattern) => {
    const result = {};
    poll.days.forEach((day, index) => {
      const picks = pattern[index] || [false, false, false];
      result[day.date] = { breakfast: picks[0], lunch: picks[1], dinner: picks[2] };
    });
    return result;
  };

  const weekdayPattern = (breakfast, lunch, dinner) =>
    Array.from({ length: 7 }, () => [breakfast, lunch, dinner]);

  const currentSelections = [
    {
      id: 'sel-1',
      pollId: 'poll-current',
      hostellerId: 'hst-rahul',
      days: selectionDays(foodPolls[0], weekdayPattern(true, true, true)),
      submittedAt: at(1, 20),
      updatedAt: at(1, 20),
    },
    {
      id: 'sel-2',
      pollId: 'poll-current',
      hostellerId: 'hst-priya',
      days: selectionDays(foodPolls[0], weekdayPattern(true, true, false)),
      submittedAt: at(1, 18),
      updatedAt: at(1, 18),
    },
    {
      id: 'sel-3',
      pollId: 'poll-current',
      hostellerId: 'hst-sneha',
      days: selectionDays(foodPolls[0], weekdayPattern(false, true, true)),
      submittedAt: at(0, 8),
      updatedAt: at(0, 8),
    },
    {
      id: 'sel-4',
      pollId: 'poll-current',
      hostellerId: 'hst-vikram',
      days: selectionDays(foodPolls[0], weekdayPattern(true, true, false)),
      submittedAt: at(2, 21),
      updatedAt: at(2, 21),
    },
  ];

  const previousSelections = [
    {
      id: 'sel-5',
      pollId: 'poll-previous',
      hostellerId: 'hst-rahul',
      days: selectionDays(foodPolls[1], weekdayPattern(true, true, true)),
      submittedAt: at(9, 12),
      updatedAt: at(9, 12),
    },
    {
      id: 'sel-6',
      pollId: 'poll-previous',
      hostellerId: 'hst-karan',
      days: selectionDays(foodPolls[1], weekdayPattern(false, true, true)),
      submittedAt: at(8, 12),
      updatedAt: at(8, 12),
    },
  ];

  return {
    version: 1,
    admins: [
      {
        id: 'adm-main',
        name: 'Hostel Administrator',
        username: 'admin',
        password: 'admin123',
        createdAt: at(600, 9),
      },
    ],
    hostellers,
    outings,
    foodPolls,
    foodSelections: [...currentSelections, ...previousSelections],
    rentPayments,
    advancePayments,
    dismissedNotifications: [],
    meta: {
      seededAt: new Date().toISOString(),
      note: 'Phase 1 demo data stored in LocalStorage.',
    },
  };
}
