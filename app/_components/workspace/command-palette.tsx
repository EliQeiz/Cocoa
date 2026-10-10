"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Search, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function CommandPalette({
  open,
  onOpenChange,
  items,
  projects,
  onNavigate,
  onProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Array<[LucideIcon, string]>;
  projects: Array<{ id: string; name: string; project_code: string }>;
  onNavigate: (name: string) => void;
  onProject: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);
  const search = query.toLowerCase().trim();
  const modules = items.filter(([, name]) =>
    name.toLowerCase().includes(search),
  );
  const matches = projects.filter((project) =>
    `${project.name} ${project.project_code}`.toLowerCase().includes(search),
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="command-overlay" />
        <Dialog.Content className="command-content">
          <Dialog.Title className="sr-only">Search workspace</Dialog.Title>
          <Dialog.Description className="sr-only">
            Find a project or jump to a workspace module. Tab through results
            and press Enter to open.
          </Dialog.Description>
          <div className="command-input">
            <Search size={20} />
            <input
              aria-label="Find projects or modules"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a project or module…"
            />
            <Dialog.Close className="command-close" aria-label="Close search">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="command-results">
            {matches.length > 0 && <p>PROJECTS</p>}
            {matches.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onProject(project.id);
                  onOpenChange(false);
                }}
              >
                <Search size={18} />
                <span>
                  {project.name}
                  <small>{project.project_code}</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
            {modules.length > 0 && <p>WORKSPACE</p>}
            {modules.map(([Icon, name]) => (
              <button
                key={name}
                onClick={() => {
                  onNavigate(name);
                  onOpenChange(false);
                }}
              >
                <Icon size={18} />
                <span>{name}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
            {!matches.length && !modules.length && (
              <p>No matches. Try “Evidence”, “Team” or a project name.</p>
            )}
          </div>
          <div className="command-footer">
            Tab to select · Enter to open · Esc to close
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
