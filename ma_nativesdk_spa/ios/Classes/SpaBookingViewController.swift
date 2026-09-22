import UIKit

/**
 * SpaBookingViewController - Native iOS Entry Point for the Lotus Spa Mini App.
 *
 * Presented modally by the Super App host via The Universal Native Mini App Launcher:
 *   FlutterMethodChannel("superapp/native_launcher")
 */
@objc(SpaBookingViewController)
public class SpaBookingViewController: UIViewController {

    public var userId: String?
    public var authToken: String?
    public var launchParams: [String: Any]?

    public override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    private func setupUI() {
        view.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1.0)

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24)
        ])

        let titleLabel = UILabel()
        titleLabel.text = "🌿 Lotus Spa & Wellness"
        titleLabel.font = UIFont.boldSystemFont(ofSize: 22)
        titleLabel.textColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)
        stack.addArrangedSubview(titleLabel)

        let badge = UILabel()
        badge.text = " Verified iOS Native SDK Mini App "
        badge.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        badge.textColor = UIColor(red: 0.01, green: 0.52, blue: 0.78, alpha: 1.0)
        badge.backgroundColor = UIColor(red: 0.88, green: 0.95, blue: 0.99, alpha: 1.0)
        badge.layer.cornerRadius = 6
        badge.clipsToBounds = true
        stack.addArrangedSubview(badge)

        let detailLabel = UILabel()
        detailLabel.numberOfLines = 0
        detailLabel.textAlignment = .center
        detailLabel.font = UIFont.systemFont(ofSize: 14)
        detailLabel.textColor = UIColor(red: 0.20, green: 0.25, blue: 0.33, alpha: 1.0)
        let user = userId ?? "Guest"
        detailLabel.text = "Active User: \(user)\nAuth: \(authToken != nil ? "Authenticated" : "Anonymous")"
        stack.addArrangedSubview(detailLabel)

        let bookButton = UIButton(type: .system)
        bookButton.setTitle("Confirm Reservation", for: .normal)
        bookButton.setTitleColor(.white, for: .normal)
        bookButton.backgroundColor = UIColor(red: 0.05, green: 0.65, blue: 0.91, alpha: 1.0)
        bookButton.layer.cornerRadius = 10
        bookButton.contentEdgeInsets = UIEdgeInsets(top: 12, left: 24, bottom: 12, right: 24)
        bookButton.addTarget(self, action: #selector(handleBook), for: .touchUpInside)
        stack.addArrangedSubview(bookButton)

        let closeButton = UIButton(type: .system)
        closeButton.setTitle("Return to Super App", for: .normal)
        closeButton.setTitleColor(UIColor(red: 0.28, green: 0.33, blue: 0.41, alpha: 1.0), for: .normal)
        closeButton.addTarget(self, action: #selector(handleClose), for: .touchUpInside)
        stack.addArrangedSubview(closeButton)
    }

    @objc private func handleBook() {
        let alert = UIAlertController(title: "Success", message: "Spa reservation confirmed!", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.dismiss(animated: true, completion: nil)
        })
        present(alert, animated: true, completion: nil)
    }

    @objc private func handleClose() {
        dismiss(animated: true, completion: nil)
    }
}
