import { db } from "../lib/firebase.js";
import { collection, query, where, getDocs } from "firebase/firestore";

const testAttendanceQuery = async () => {
  try {
    const q = query(
      collection(db, "attendance"),
      where("username", "==", "meet")
    );

    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("Attendance records:", data);
  } catch (error) {
    console.error("Test query failed:", error);
  }
};

testAttendanceQuery();