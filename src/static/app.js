document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear any previous options in the select (avoid duplicates on re-fetch)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML
        let participantsHTML = '<div class="participants">';
        participantsHTML += '<h5>Participants</h5>';
        participantsHTML += '<ul class="participants-list">';

        if (Array.isArray(details.participants) && details.participants.length > 0) {
          details.participants.forEach((p) => {
            // simple escaping of < and > to reduce injection risk in this small app
            const safeP = String(p).replace(/</g, "&lt;").replace(/>/g, "&gt;");
            // store raw values in data attributes (encoded) and show safe text
            const encodedActivity = encodeURIComponent(name);
            const encodedEmail = encodeURIComponent(p);
            participantsHTML += `<li><span class="participant-email">${safeP}</span> <button class="participant-remove" data-activity="${encodedActivity}" data-email="${encodedEmail}" aria-label="Remove ${safeP}">✕</button></li>`;
          });
        } else {
          participantsHTML += '<li class="no-participants">No participants yet</li>';
        }

        participantsHTML += '</ul></div>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participant remove buttons inside this card
        activityCard.querySelectorAll('.participant-remove').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const activityName = decodeURIComponent(btn.dataset.activity);
            const email = decodeURIComponent(btn.dataset.email);

            // Ask for a small confirmation
            if (!confirm(`Remove ${email} from ${activityName}?`)) return;

            try {
              const res = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
                method: 'POST'
              });

              const result = await res.json();
              if (res.ok) {
                // Refresh the activities list to reflect the change
                fetchActivities();
              } else {
                console.error('Failed to remove participant', result);
                alert(result.detail || 'Failed to remove participant');
              }
            } catch (err) {
              console.error('Error removing participant', err);
              alert('Error removing participant. Please try again.');
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // keep the base "message" class and add modifier
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities immediately so the newly signed-up participant appears
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
