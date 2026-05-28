'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/app/dashboard/actions';
import { getRelationships } from '@/app/contacts/actions';
import { Network, User, Heart, ChevronDown } from 'lucide-react';

export default function FamilyTreePage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rootId, setRootId] = useState<string>('');

  useEffect(() => {
    loadTreeData();
  }, []);

  const loadTreeData = async () => {
    try {
      const dbData = await getDashboardData();
      const rels = await getRelationships();
      setContacts(dbData.contacts);
      setRelationships(rels);

      // Auto-select first contact who is a parent as the default root
      const parentRel = rels.find((r) => r.relation_type === 'parent');
      if (parentRel) {
        setRootId(parentRel.contact_a_id);
      } else if (dbData.contacts.length > 0) {
        setRootId(dbData.contacts[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to find spouse
  const getSpouse = (personId: string) => {
    const rel = relationships.find(
      (r) => r.relation_type === 'spouse' && (r.contact_a_id === personId || r.contact_b_id === personId)
    );
    if (!rel) return null;
    const spouseId = rel.contact_a_id === personId ? rel.contact_b_id : rel.contact_a_id;
    return contacts.find((c) => c.id === spouseId);
  };

  // Helper to find children
  const getChildren = (personId: string) => {
    const spouse = getSpouse(personId);
    const parentIds = [personId];
    if (spouse) parentIds.push(spouse.id);

    // Find relationships where type is parent and contact_a is either parent
    const childRels = relationships.filter(
      (r) => r.relation_type === 'parent' && parentIds.includes(r.contact_a_id)
    );
    
    // De-duplicate child IDs
    const childIds = Array.from(new Set(childRels.map((r) => r.contact_b_id)));
    return contacts.filter((c) => childIds.includes(c.id));
  };

  // Build generation levels starting from selected root person
  const buildTree = (rootPersonId: string) => {
    if (!rootPersonId) return [];

    const root = contacts.find((c) => c.id === rootPersonId);
    if (!root) return [];

    const treeData: any[] = [];
    
    // Gen 0: Root + Spouse
    const gen0 = {
      level: 0,
      couples: [
        {
          partnerA: root,
          partnerB: getSpouse(root.id),
          children: getChildren(root.id)
        }
      ]
    };
    treeData.push(gen0);

    // Gen 1: Children + their spouses
    const gen0Children = gen0.couples[0].children;
    if (gen0Children.length > 0) {
      const gen1Couples = gen0Children.map((child) => ({
        partnerA: child,
        partnerB: getSpouse(child.id),
        children: getChildren(child.id)
      }));

      treeData.push({
        level: 1,
        couples: gen1Couples
      });

      // Gen 2: Grandchildren
      const gen2Children: any[] = [];
      gen1Couples.forEach((c) => {
        gen2Children.push(...c.children);
      });

      if (gen2Children.length > 0) {
        treeData.push({
          level: 2,
          couples: gen2Children.map((grandchild) => ({
            partnerA: grandchild,
            partnerB: getSpouse(grandchild.id),
            children: []
          }))
        });
      }
    }

    return treeData;
  };

  const treeGenerations = buildTree(rootId);
  const selectedRootContact = contacts.find((c) => c.id === rootId);

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Building family tree...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network style={{ color: 'var(--color-gold)' }} /> Family Trees
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Visualize lineages, marriages, and generational lines.
        </p>
      </div>

      {/* Select Root Dropdown */}
      <div style={{ padding: '0 16px 20px 16px' }}>
        <div className="card" style={{ margin: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Select Tree Root</span>
            <h4 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
              {selectedRootContact ? `${selectedRootContact.first_name}${selectedRootContact.middle_name ? ' ' + selectedRootContact.middle_name : ''} ${selectedRootContact.last_name}'s Tree` : 'No contact selected'}
            </h4>
          </div>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '160px', height: '36px', fontSize: '12px' }}
            value={rootId}
            onChange={(e) => setRootId(e.target.value)}
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name}{c.middle_name ? ' ' + c.middle_name : ''} {c.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tree Visualization Workspace */}
      <div style={{
        overflowX: 'auto',
        padding: '20px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
        position: 'relative'
      }}>
        {treeGenerations.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Select a tree root above to generate the pedigree chart.
          </div>
        ) : (
          treeGenerations.map((gen, gIdx) => (
            <div 
              key={gen.level}
              style={{
                display: 'flex',
                gap: '40px',
                justifyContent: 'center',
                width: '100%',
                position: 'relative'
              }}
            >
              {gen.couples.map((couple: any, cIdx: number) => {
                const partnerA = couple.partnerA;
                const partnerB = couple.partnerB;

                return (
                  <div 
                    key={partnerA.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative'
                    }}
                  >
                    {/* Couple Box */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-card)',
                      border: 'var(--border-thin)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      gap: '8px',
                      boxShadow: 'var(--shadow-soft)',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      {/* Partner A */}
                      <div style={{ textAlign: 'center', minWidth: '80px' }}>
                        <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {partnerA.first_name}
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                          {partnerA.last_name}
                        </span>
                      </div>

                      {/* Spouse Heart Divider */}
                      {partnerB && (
                        <>
                          <Heart size={12} style={{ color: 'var(--color-rose)', fill: 'var(--color-rose-light)' }} />
                          {/* Partner B */}
                          <div style={{ textAlign: 'center', minWidth: '80px' }}>
                            <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {partnerB.first_name}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                              {partnerB.last_name}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* SVG Connector Lines to next Generation */}
                    {gIdx < treeGenerations.length - 1 && couple.children?.length > 0 && (
                      <svg 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '200px',
                          height: '40px',
                          zIndex: 1,
                          overflow: 'visible'
                        }}
                      >
                        {/* Vertical line down from parents */}
                        <line x1="100" y1="0" x2="100" y2="20" stroke="var(--color-gold)" strokeWidth="1.5" />
                        
                        {/* Horizontal branch line */}
                        <line x1="20" y1="20" x2="180" y2="20" stroke="var(--color-gold)" strokeWidth="1.5" />
                        
                        {/* Vertical lines down to children slots */}
                        {couple.children.map((_: any, idx: number, arr: any[]) => {
                          const childCount = arr.length;
                          const spacing = childCount > 1 ? 160 / (childCount - 1) : 0;
                          const x = childCount > 1 ? 20 + idx * spacing : 100;
                          return (
                            <line 
                              key={idx} 
                              x1={x} 
                              y1="20" 
                              x2={x} 
                              y2="40" 
                              stroke="var(--color-gold)" 
                              strokeWidth="1.5" 
                            />
                          );
                        })}
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
