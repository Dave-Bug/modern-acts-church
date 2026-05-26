import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../Services/firebase";

export default function MediaTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
  });

  // ✅ REAL-TIME READ
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "media_tasks"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("🔥 Firestore Tasks:", data);

        setTasks(data);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // ✅ ADD TASK
  const addTask = async () => {
    if (!form.title.trim()) return;

    await addDoc(collection(db, "media_tasks"), {
      title: form.title,
      description: form.description,
      assignedTo: form.assignedTo,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    setForm({
      title: "",
      description: "",
      assignedTo: "",
    });
  };

  // ✅ UPDATE STATUS
  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "media_tasks", id), {
      status,
    });
  };

  // ✅ DELETE TASK
  const deleteTask = async (id) => {
    await deleteDoc(doc(db, "media_tasks", id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">
        🎥 Media Team Task Board
      </h1>

      {/* FORM */}
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <input
          className="p-2 rounded bg-slate-800"
          placeholder="Task title"
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
        />

        <input
          className="p-2 rounded bg-slate-800"
          placeholder="Assigned to"
          value={form.assignedTo}
          onChange={(e) =>
            setForm({ ...form, assignedTo: e.target.value })
          }
        />

        <button
          onClick={addTask}
          className="bg-sky-500 rounded p-2 font-bold"
        >
          Add Task
        </button>
      </div>

      <textarea
        className="w-full p-2 rounded bg-slate-800 mb-6"
        placeholder="Description"
        value={form.description}
        onChange={(e) =>
          setForm({ ...form, description: e.target.value })
        }
      />

      {/* TASK LIST */}
      <div className="grid gap-4">
        {loading ? (
          <p className="text-slate-400">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-400">
            No tasks yet. Add one above 👆
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-900 p-4 rounded-xl border border-slate-700"
            >
              <h2 className="font-bold text-lg">
                {task.title}
              </h2>

              <p className="text-slate-400 text-sm">
                {task.description}
              </p>

              <p className="text-xs mt-2">
                Assigned to:{" "}
                <span className="text-sky-400">
                  {task.assignedTo}
                </span>
              </p>

              <p className="text-xs mt-1">
                Status:{" "}
                <span className="text-yellow-400">
                  {task.status}
                </span>
              </p>

              {/* ACTIONS */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() =>
                    updateStatus(task.id, "in-progress")
                  }
                  className="px-2 py-1 bg-blue-600 rounded text-xs"
                >
                  In Progress
                </button>

                <button
                  onClick={() =>
                    updateStatus(task.id, "done")
                  }
                  className="px-2 py-1 bg-green-600 rounded text-xs"
                >
                  Done
                </button>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="px-2 py-1 bg-red-600 rounded text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}