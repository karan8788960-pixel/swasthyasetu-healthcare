import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CreateAppointmentBody,
  CreateAppointmentResponse,
  CreateConsultationRoomBody,
  CreateConsultationRoomResponse,
  ListAppointmentsResponse,
  ListDoctorsQueryParams,
  ListDoctorsResponse,
  ListHospitalsQueryParams,
  ListHospitalsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
type ConsultationMode = "video" | "in-person";

const hospitals = [
  {
    id: "F1",
    name: "District Hospital, Sehore",
    type: "District Hospital",
    district: "Sehore",
    distanceKm: 15,
    emergency: true,
    address: "Bhopal Road, Sehore, Madhya Pradesh",
    phone: "07562 220 108",
    lat: 23.2032,
    lng: 77.0844,
    openNow: true,
  },
  {
    id: "F2",
    name: "Kotra Community Health Centre",
    type: "Community Health Centre",
    district: "Sehore",
    distanceKm: 8,
    emergency: true,
    address: "Kotra village, Sehore district",
    phone: "07562 284 221",
    lat: 23.2949,
    lng: 77.3374,
    openNow: true,
  },
  {
    id: "F3",
    name: "Semra Primary Health Centre",
    type: "Primary Health Centre",
    district: "Vidisha",
    distanceKm: 22,
    emergency: false,
    address: "Semra main road, Vidisha district",
    phone: "07592 248 031",
    lat: 23.525,
    lng: 77.812,
    openNow: true,
  },
  {
    id: "F4",
    name: "Raisen Civil Hospital",
    type: "Civil Hospital",
    district: "Raisen",
    distanceKm: 42,
    emergency: true,
    address: "Hospital Road, Raisen, Madhya Pradesh",
    phone: "07482 222 015",
    lat: 23.3315,
    lng: 77.7882,
    openNow: false,
  },
];

const doctors: Array<{
  id: string;
  name: string;
  specialty: string;
  facility: string;
  languages: string[];
  modes: ConsultationMode[];
  rating: number;
  nextSlot: string;
}> = [
  {
    id: "D1",
    name: "Dr. Anita Verma",
    specialty: "General Physician",
    facility: "Kotra Community Health Centre",
    languages: ["Hindi", "English"],
    modes: ["video", "in-person"],
    rating: 4.7,
    nextSlot: "Today, 4:30 PM",
  },
  {
    id: "D2",
    name: "Dr. Rakesh Meena",
    specialty: "Pediatrics",
    facility: "District Hospital, Sehore",
    languages: ["Hindi"],
    modes: ["video"],
    rating: 4.8,
    nextSlot: "Tomorrow, 10:00 AM",
  },
  {
    id: "D3",
    name: "Dr. Farah Sheikh",
    specialty: "Gynaecology & Obstetrics",
    facility: "Semra Primary Health Centre",
    languages: ["Hindi", "English", "Urdu"],
    modes: ["video", "in-person"],
    rating: 4.9,
    nextSlot: "Today, 6:00 PM",
  },
];

type Appointment = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  mode: "video" | "in-person";
  status: "confirmed" | "pending" | "completed";
  roomName: string | null;
};

const appointments: Appointment[] = [
  {
    id: "AP-2031",
    doctorId: "D1",
    doctorName: "Dr. Anita Verma",
    specialty: "General Physician",
    date: "2026-09-18",
    time: "4:30 PM",
    mode: "video",
    status: "confirmed",
    roomName: "swasthya-ap-2031",
  },
];

router.get("/hospitals", (req, res) => {
  const query = ListHospitalsQueryParams.parse(req.query);
  const normalized = query.query?.toLowerCase();
  const result = hospitals.filter((hospital) => {
    const matchesQuery =
      !normalized ||
      [hospital.name, hospital.type, hospital.district, hospital.address]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    const matchesEmergency = query.emergency === undefined || hospital.emergency === query.emergency;
    return matchesQuery && matchesEmergency;
  });
  res.json(ListHospitalsResponse.parse(result));
});

router.get("/doctors", (req, res) => {
  const query = ListDoctorsQueryParams.parse(req.query);
  const result = doctors.filter((doctor) => {
    const matchesSpecialty =
      !query.specialty || doctor.specialty.toLowerCase().includes(query.specialty.toLowerCase());
    const matchesMode = !query.mode || doctor.modes.includes(query.mode);
    return matchesSpecialty && matchesMode;
  });
  res.json(ListDoctorsResponse.parse(result));
});

router.get("/appointments", (_req, res) => {
  res.json(ListAppointmentsResponse.parse(appointments));
});

router.post("/appointments", (req, res) => {
  const body = CreateAppointmentBody.parse(req.body);
  const doctor = doctors.find((item) => item.id === body.doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  if (!doctor.modes.includes(body.mode)) {
    res.status(400).json({ error: "This consultation mode is not available for the doctor" });
    return;
  }
  const appointment: Appointment = {
    id: `AP-${Math.floor(2000 + Math.random() * 7000)}`,
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date: body.date,
    time: body.time,
    mode: body.mode,
    status: "confirmed",
    roomName: body.mode === "video" ? `swasthya-${randomUUID().slice(0, 8)}` : null,
  };
  appointments.unshift(appointment);
  res.status(201).json(CreateAppointmentResponse.parse(appointment));
});

router.post("/consultations/room", (req, res) => {
  const body = CreateConsultationRoomBody.parse(req.body);
  const doctor = doctors.find((item) => item.id === body.doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  const roomName = `SwasthyaSetu-${doctor.id}-${randomUUID().slice(0, 8)}`;
  const room = {
    roomName,
    provider: "jitsi" as const,
    joinUrl: `https://meet.jit.si/${roomName}`,
  };
  res.status(201).json(CreateConsultationRoomResponse.parse(room));
});

export default router;