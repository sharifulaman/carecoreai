import { Plus, X, User } from "lucide-react";
import { useState } from "react";

export function IncidentPeopleInvolvedSection({ form, setForm, staff, residents }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: "", role: "", type: "staff" });

  const addPerson = () => {
    if (!newPerson.name.trim()) return;
    const peopleInvolved = form.people_involved || [];
    setForm(f => ({
      ...f,
      people_involved: [...peopleInvolved, { ...newPerson, id: Date.now() }]
    }));
    setNewPerson({ name: "", role: "", type: "staff" });
    setShowAdd(false);
  };

  const removePerson = (id) => {
    setForm(f => ({
      ...f,
      people_involved: (f.people_involved || []).filter(p => p.id !== id)
    }));
  };

  const peopleInvolved = form.people_involved || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-600">People involved in incident</h4>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add person
        </button>
      </div>

      {showAdd && (
        <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
              <select
                value={newPerson.type}
                onChange={e => setNewPerson({ ...newPerson, type: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
              >
                <option value="staff">Staff</option>
                <option value="resident">Resident</option>
                <option value="visitor">Visitor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Name</label>
              <input
                type="text"
                value={newPerson.name}
                onChange={e => setNewPerson({ ...newPerson, name: e.target.value })}
                placeholder="Full name"
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Role/relationship</label>
            <input
              type="text"
              value={newPerson.role}
              onChange={e => setNewPerson({ ...newPerson, role: e.target.value })}
              placeholder="e.g. Support worker, visitor, friend"
              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addPerson}
              className="flex-1 px-3 py-1.5 rounded bg-teal-600 text-white text-xs font-medium hover:bg-teal-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 px-3 py-1.5 rounded border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {peopleInvolved.length > 0 ? (
        <div className="space-y-2">
          {peopleInvolved.map(person => (
            <div key={person.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-700 truncate">{person.name}</p>
                  <p className="text-slate-500 text-xs">{person.role} · {person.type}</p>
                </div>
              </div>
              <button
                onClick={() => removePerson(person.id)}
                className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No people added yet</p>
      )}
    </div>
  );
}